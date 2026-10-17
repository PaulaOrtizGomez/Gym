import { db } from '../db/database'
import { APPEARANCE_DEFAULTS } from './appearanceConfig'
import type { AppSettings, RoutineDay } from '../types/domain'

/**
 * Excepciones para una FECHA concreta, independientes del horario recurrente.
 * Se guardan como filas con otro ID en appSettings para conservar las 13 tablas
 * y la compatibilidad con el respaldo/restauración JSON de Gym Tracker v4.
 * Nunca se modifica la fila id='appearance'.
 */
type CalendarExceptionRow = AppSettings & {
  routineId: string
  date: string
  dayId: string | null
  disabled?: boolean
}

export type CalendarException = { date: string; dayId: string | null }
export type DateChange = { date: string; dayId: string | null | undefined }

const PREFIX = 'calendar-date-v1:'

function validDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const [year, month, day] = key.split('-').map(Number)
  const value = new Date(year, month - 1, day, 12)
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day
}

function recordId(routineId: string, date: string) {
  return `${PREFIX}${routineId}:${date}`
}

function asException(value: AppSettings | undefined, routineId: string, date: string): CalendarException | null {
  if (!value) return null
  const row = value as CalendarExceptionRow
  if (row.disabled || row.routineId !== routineId || row.date !== date ||
      !(row.dayId === null || typeof row.dayId === 'string')) return null
  return { date, dayId: row.dayId }
}

export async function getCalendarExceptions(routineId: string, dates: string[]): Promise<Map<string, CalendarException>> {
  const unique = [...new Set(dates)]
  if (!routineId || unique.some((date) => !validDate(date))) return new Map()
  const rows = await Promise.all(unique.map((date) => db.appSettings.get(recordId(routineId, date))))
  const results = new Map<string, CalendarException>()
  unique.forEach((date, index) => {
    const value = asException(rows[index], routineId, date)
    if (value) results.set(date, value)
  })
  return results
}

/** Si una fecha es descanso puntual, retorna undefined sin recurrir al horario semanal. */
export async function getScheduledRoutineDay(
  routineId: string,
  date: string,
  days: RoutineDay[],
): Promise<RoutineDay | undefined> {
  const overrides = await getCalendarExceptions(routineId, [date])
  const override = overrides.get(date)
  if (override) {
    if (override.dayId === null) return undefined
    return days.find((day) => day.id === override.dayId && !day.deletedAt)
  }
  const weekday = new Date(`${date}T12:00:00`).getDay()
  return days.find((day) => !day.deletedAt && day.dayOfWeek === weekday)
}

/**
 * dayId undefined: desactivar excepción y restaurar el día habitual;
 * dayId null: descanso para esta fecha;
 * dayId string: sesión excepcional para esta fecha.
 */
export async function saveCalendarExceptions(routineId: string, changes: DateChange[]): Promise<number> {
  if (!routineId || changes.length === 0) return 0
  if (new Set(changes.map((item) => item.date)).size !== changes.length ||
      changes.some((item) => !validDate(item.date))) {
    throw new Error('Hay una fecha duplicada o incorrecta. Actualiza el plan y vuelve a intentarlo.')
  }

  return db.transaction('rw', db.routines, db.routineDays, db.appSettings, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine || routine.deletedAt) throw new Error('La rutina ya no está disponible.')
    const routineDays = await db.routineDays.where('routineId').equals(routineId)
      .filter((day) => !day.deletedAt).toArray()
    const validIds = new Set(routineDays.map((day) => day.id))
    if (changes.some((item) => item.dayId !== undefined && item.dayId !== null && !validIds.has(item.dayId))) {
      throw new Error('Una sesión ya no está disponible. Actualiza el plan.')
    }

    const now = new Date().toISOString()
    let changed = 0
    for (const item of changes) {
      const id = recordId(routineId, item.date)
      const current = await db.appSettings.get(id)
      const previous = asException(current, routineId, item.date)
      if (item.dayId === undefined && !previous) continue
      if (previous && previous.dayId === item.dayId) continue
      const row: CalendarExceptionRow = {
        ...APPEARANCE_DEFAULTS,
        id,
        routineId,
        date: item.date,
        dayId: item.dayId ?? null,
        disabled: item.dayId === undefined,
        updatedAt: now,
      }
      await db.appSettings.put(row)
      changed += 1
    }
    return changed
  })
}
