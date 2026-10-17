import { db } from '../db/database'
import { getCalendarExceptions } from './calendarExceptionService'
import { getRoutineDays, getRoutines } from './routineService'
import type { Routine, RoutineDay } from '../types/domain'

/** Días de JavaScript: domingo=0; lunes=1. Siempre mostramos lunes a domingo. */
export const WEEK_DAYS = [
  { index: 1, name: 'Lunes', short: 'Lun' },
  { index: 2, name: 'Martes', short: 'Mar' },
  { index: 3, name: 'Miércoles', short: 'Mié' },
  { index: 4, name: 'Jueves', short: 'Jue' },
  { index: 5, name: 'Viernes', short: 'Vie' },
  { index: 6, name: 'Sábado', short: 'Sáb' },
  { index: 0, name: 'Domingo', short: 'Dom' },
] as const

export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WeeklySlot = {
  dayOfWeek: WeekDayIndex
  name: string
  date: string // YYYY-MM-DD, zona local
  dayIds: string[] // asignación EFECTIVA para esta fecha
  recurringIds: string[] // asignación habitual (lunes a domingo)
  overrideActive: boolean // cambio puntual para esta fecha
  exerciseCount: number
  completedCount: number
  inProgressCount: number
  otherCompletedCount: number
}

export type WeeklyPlannerData = {
  routines: Routine[]
  routine: Routine | null
  routineDays: RoutineDay[]
  slots: WeeklySlot[]
  weekStart: string
  weekEnd: string
}

export function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Calcula fechas locales sin sumar milisegundos, evitando problemas de horario de verano. */
export function datesOfWeek(reference: Date): Date[] {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return WEEK_DAYS.map((_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

export async function getWeeklyPlannerData(
  routineId?: string,
  reference: Date = new Date(),
): Promise<WeeklyPlannerData> {
  const routines = await getRoutines()
  const chosen = routines.find((routine) => routine.id === routineId)
    ?? routines.find((routine) => routine.active)
    ?? routines[0]
    ?? null

  const [routineDays, workouts, routineExercises] = await Promise.all([
    chosen ? getRoutineDays(chosen.id) : Promise.resolve([] as RoutineDay[]),
    db.workouts.toArray(),
    db.routineExercises.toArray(),
  ])

  const countExercises = new Map<string, number>()
  for (const exercise of routineExercises) {
    if (exercise.deletedAt) continue
    countExercises.set(exercise.routineDayId, (countExercises.get(exercise.routineDayId) ?? 0) + 1)
  }

  const dates = datesOfWeek(reference)
  const overrides = chosen
    ? await getCalendarExceptions(chosen.id, dates.map(localDateKey))
    : new Map()
  const validIds = new Set(routineDays.map((day) => day.id))
  const slots = WEEK_DAYS.map((day, index): WeeklySlot => {
    const date = localDateKey(dates[index])
    const recurringIds = routineDays
      .filter((item) => item.dayOfWeek === day.index)
      .map((item) => item.id)
    const exception = overrides.get(date)
    const overrideActive = Boolean(exception)
    const plannedIds = exception
      ? (exception.dayId && validIds.has(exception.dayId) ? [exception.dayId] : [])
      : recurringIds
    const forDate = workouts.filter((workout) => !workout.deletedAt && workout.date === date)
    const samePlan = forDate.filter((workout) =>
      workout.routineDayId !== undefined && plannedIds.includes(workout.routineDayId),
    )

    return {
      dayOfWeek: day.index,
      name: day.name,
      date,
      dayIds: plannedIds,
      recurringIds,
      overrideActive,
      exerciseCount: plannedIds.reduce((total, id) => total + (countExercises.get(id) ?? 0), 0),
      completedCount: samePlan.filter((workout) => workout.status === 'completed').length,
      inProgressCount: samePlan.filter((workout) => workout.status === 'inProgress').length,
      otherCompletedCount: forDate.filter((workout) =>
        workout.status === 'completed' &&
        (!workout.routineDayId || !plannedIds.includes(workout.routineDayId)),
      ).length,
    }
  })

  return {
    routines,
    routine: chosen,
    routineDays,
    slots,
    weekStart: localDateKey(dates[0]),
    weekEnd: localDateKey(dates[6]),
  }
}

/**
 * Guarda el plan SEMANAL RECURRENTE, no fechas individuales.
 * Reutiliza RoutineDay.dayOfWeek y conserva todos los IDs y registros.
 * Una sesión de rutina puede aparecer como máximo una vez en la semana.
 */
export async function saveWeeklyPlan(
  routineId: string,
  schedule: Record<number, string>,
): Promise<number> {
  const entries = WEEK_DAYS.map((day) => ({
    dayOfWeek: day.index,
    dayId: schedule[day.index] ?? '',
  }))
  const selectedIds = entries.map((entry) => entry.dayId).filter(Boolean)
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Una misma sesión no puede asignarse a dos días de la semana.')
  }

  return db.transaction('rw', db.routines, db.routineDays, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine || routine.deletedAt) {
      throw new Error('La rutina seleccionada ya no está disponible.')
    }

    const days = await db.routineDays.where('routineId').equals(routineId)
      .filter((day) => !day.deletedAt).toArray()
    const validIds = new Set(days.map((day) => day.id))
    if (selectedIds.some((id) => !validIds.has(id))) {
      throw new Error('Uno de los días ya no existe. Actualiza la página y vuelve a intentarlo.')
    }

    const assignedDay = new Map<string, number>()
    entries.forEach((entry) => {
      if (entry.dayId) assignedDay.set(entry.dayId, entry.dayOfWeek)
    })

    const now = new Date().toISOString()
    let changed = 0
    for (const day of days) {
      const nextDay = assignedDay.get(day.id)
      if (day.dayOfWeek === nextDay) continue
      await db.routineDays.put({ ...day, dayOfWeek: nextDay, updatedAt: now })
      changed += 1
    }
    if (changed > 0) {
      await db.routines.update(routine.id, {
        version: routine.version + 1,
        updatedAt: now,
      })
    }
    return changed
  })
}
