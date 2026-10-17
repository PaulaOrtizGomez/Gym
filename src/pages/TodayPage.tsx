import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  RefreshCw,
  Timer,
} from 'lucide-react'

import { getExercises } from '../services/exerciseService'
import { getScheduledRoutineDay } from '../services/calendarExceptionService'
import { localDateKey } from '../services/weeklyPlannerService'
import {
  getRoutineDays,
  getRoutineExercises,
  getRoutines,
} from '../services/routineService'
import {
  getActiveWorkout,
  getCompletedWorkouts,
  getSetLogs,
  getWorkoutExercises,
} from '../services/workoutService'

import type { AppTab } from '../components/layout/navigation'
import type { Workout } from '../types/domain'

type TodayPageProps = {
  onNavigate: (tab: AppTab) => void
}

type DashboardData = {
  activeWorkout: Workout | null
  activeExerciseCount: number
  activeLoggedSets: number
  routineName: string | null
  dayName: string | null
  plannedExercises: number
  todayCompleted: boolean
  routinesCount: number
  libraryCount: number
  completed: Workout[]
}

const cardClass =
  'rounded-2xl border border-[#F3D6E2] bg-white p-4 shadow-sm sm:p-5'

const primaryClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F3A4BD] px-4 py-3 font-semibold text-[#2A2228] hover:bg-[#EC8EAC]'

function readableDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
}

async function loadDashboardData(): Promise<DashboardData> {
  const [active, routines, completed, exercises] = await Promise.all([
    getActiveWorkout(),
    getRoutines(),
    getCompletedWorkouts(),
    getExercises(),
  ])

  const chosenRoutine = routines.find((routine) => routine.active)

  const days = chosenRoutine
    ? await getRoutineDays(chosenRoutine.id)
    : []

  const todayKey = localDateKey(new Date())
  const chosenDay = chosenRoutine
    ? await getScheduledRoutineDay(chosenRoutine.id, todayKey, days)
    : undefined

  const planned = chosenDay
    ? await getRoutineExercises(chosenDay.id)
    : []

  const activeExercises = active
    ? await getWorkoutExercises(active.id)
    : []

  const activeLogs = await Promise.all(
    activeExercises.map((exercise) => getSetLogs(exercise.id)),
  )

  return {
    activeWorkout: active ?? null,
    activeExerciseCount: activeExercises.length,
    activeLoggedSets: activeLogs.reduce(
      (total, logs) => total + logs.length,
      0,
    ),
    routineName: chosenRoutine?.name ?? null,
    dayName: chosenDay?.name ?? null,
    plannedExercises: planned.length,
    todayCompleted: completed.some((workout) =>
      Boolean(chosenDay) && workout.routineDayId === chosenDay?.id &&
      workout.date === todayKey,
    ),
    routinesCount: routines.length,
    libraryCount: exercises.length,
    completed,
  }
}

export default function TodayPage({ onNavigate }: TodayPageProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await loadDashboardData()
        if (!cancelled) {
          setData(result)
          setError('')
          setLoading(false)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen.')
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [revision])

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 pb-6 text-[#2A2228]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B44F7C]">
            Tu espacio fitness
          </p>
          <h1 className="mt-1 text-3xl font-extrabold">Hoy</h1>
          <p className="mt-1 text-sm text-[#746870]">
            Tu entrenamiento y progreso, con datos reales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setRevision((previous) => previous + 1)
          }}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#F3D6E2] bg-white px-3 text-sm font-medium text-[#B44F7C] disabled:opacity-50"
          aria-label="Actualizar resumen"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </button>
      </header>

      {loading && (
        <div role="status" className={cardClass}>
          Cargando tus datos…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <section className={`${cardClass} space-y-4`}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#FFF0F6] p-3 text-[#E30B5D]">
                {data.activeWorkout ? <Timer size={22} /> : <Dumbbell size={22} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#B44F7C]">
                  {data.activeWorkout ? 'Sesión en curso' : 'Tu plan de hoy'}
                </p>
                <h2 className="mt-1 break-words text-xl font-extrabold">
                  {data.activeWorkout
                    ? (data.activeWorkout.routineDayNameSnapshot ?? 'Entrenamiento en curso')
                    : (data.dayName ?? (data.routineName ? 'Descanso / sin sesión programada' : 'Sin rutina activa'))}
                </h2>
                <p className="mt-1 text-sm text-[#746870]">
                  {data.activeWorkout
                    ? `${data.activeWorkout.routineNameSnapshot ?? 'Sesión libre'} · ${data.activeExerciseCount} ejercicios · ${data.activeLoggedSets} series guardadas`
                    : data.routineName
                      ? (data.dayName ? `${data.routineName} · ${data.plannedExercises} ejercicios programados${data.todayCompleted ? ' · Sesión completada' : ''}` : `${data.routineName} · Puedes descansar o entrenar libremente`)
                      : 'Activa una rutina en Mis rutinas para ver tu plan de hoy.'}
                </p>
              </div>
            </div>

            {data.activeWorkout ? (
              <button type="button" className={primaryClass} onClick={() => onNavigate('workout')}>
                <ArrowRight size={18} aria-hidden="true" />
                Continuar entrenamiento
              </button>
            ) : data.dayName ? (
              <button type="button" className={primaryClass} onClick={() => onNavigate('workout')}>
                <Dumbbell size={18} aria-hidden="true" />
                Ir a Entrenar (día de hoy seleccionado)
              </button>
            ) : (
              <button type="button" className={primaryClass} onClick={() => onNavigate('routines')}>
                <ArrowRight size={18} aria-hidden="true" />
                Abrir plan semanal
              </button>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className={cardClass}>
              <p className="text-2xl font-extrabold tabular-nums">{data.completed.length}</p>
              <p className="mt-1 text-xs text-[#746870]">Sesiones finalizadas</p>
            </div>
            <div className={cardClass}>
              <p className="text-2xl font-extrabold tabular-nums">{data.routinesCount}</p>
              <p className="mt-1 text-xs text-[#746870]">Rutinas disponibles</p>
            </div>
            <div className={`${cardClass} col-span-2 sm:col-span-1`}>
              <p className="text-2xl font-extrabold tabular-nums">{data.libraryCount}</p>
              <p className="mt-1 text-xs text-[#746870]">Ejercicios en biblioteca</p>
            </div>
          </div>

          <section className={`${cardClass} space-y-3`}>
            <div className="flex items-center gap-2">
              <CalendarDays size={19} className="text-[#B44F7C]" aria-hidden="true" />
              <h2 className="text-lg font-bold">Últimas sesiones</h2>
            </div>

            {data.completed.length === 0 ? (
              <p className="text-sm text-[#746870]">
                Aún no hay entrenamientos finalizados. Aparecerán aquí cuando termines una sesión.
              </p>
            ) : (
              <div className="divide-y divide-[#F3D6E2]">
                {data.completed.slice(0, 3).map((workout) => (
                  <div key={workout.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#579474]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">
                        {workout.routineDayNameSnapshot ?? 'Entrenamiento'}
                      </p>
                      <p className="mt-1 text-xs text-[#746870]">
                        {workout.routineNameSnapshot ?? 'Sesión libre'} · {readableDate(workout.startTime)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[#746870]">
              Este es un resumen. El historial detallado se incorporará al módulo Progreso.
            </p>
          </section>
        </>
      )}
    </section>
  )
}
