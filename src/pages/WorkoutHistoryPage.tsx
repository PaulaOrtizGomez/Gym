import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  RefreshCw,
} from 'lucide-react'

import type {
  SetLog,
  Workout,
  WorkoutExercise,
} from '../types/domain'

import {
  getCompletedWorkouts,
  getSetLogs,
  getWorkoutExercises,
} from '../services/workoutService'

import type { AppTab } from '../components/layout/navigation'

type Props = {
  onNavigate: (tab: AppTab) => void
}

type ExerciseWithSets = {
  exercise: WorkoutExercise
  logs: SetLog[]
}

type SessionDetail = ExerciseWithSets[]

const cardClass =
  'rounded-2xl border border-[#F3D6E2] bg-white p-4 shadow-sm sm:p-5'

const actionClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F3D6E2] bg-white px-4 py-2 text-sm font-semibold text-[#A3275A] hover:bg-[#FFF0F6] disabled:opacity-50'

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo consultar el historial.'
}

function formatDate(date: string): string {
  const parts = date.split('-').map(Number)

  if (
    parts.length !== 3 ||
    parts.some((value) => !Number.isInteger(value))
  ) {
    return date
  }

  const [year, month, day] = parts
  const localDate = new Date(year, month - 1, day)

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(localDate)
}

function formatDuration(workout: Workout): string {
  if (!workout.endTime) return 'Duración no registrada'

  const start = Date.parse(workout.startTime)
  const end = Date.parse(workout.endTime)

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start
  ) {
    return 'Duración no disponible'
  }

  const totalMinutes = Math.round((end - start) / 60000)

  if (totalMinutes < 1) return 'Menos de 1 min'
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return minutes === 0
    ? `${hours} h`
    : `${hours} h ${minutes} min`
}

function formatWeight(weight: number): string {
  return `${weight.toLocaleString('es-CL', {
    maximumFractionDigits: 2,
  })} kg`
}

async function readDetails(workoutId: string): Promise<SessionDetail> {
  const exercises = await getWorkoutExercises(workoutId)

  return Promise.all(
    exercises.map(async (exercise) => ({
      exercise,
      logs: await getSetLogs(exercise.id),
    })),
  )
}

export default function WorkoutHistoryPage({ onNavigate }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [visibleCount, setVisibleCount] = useState(10)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, SessionDetail>>({})
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        const result = await getCompletedWorkouts()

        if (cancelled) return

        setWorkouts(result)
        setError('')
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [revision])

  async function toggleDetails(workoutId: string) {
    if (expandedId === workoutId) {
      setExpandedId(null)
      setDetailsError('')
      return
    }

    if (loadingDetailsId !== null) return

    setExpandedId(workoutId)
    setDetailsError('')

    if (details[workoutId]) return

    setLoadingDetailsId(workoutId)

    try {
      const result = await readDetails(workoutId)
      setDetails((previous) => ({ ...previous, [workoutId]: result }))
    } catch (cause) {
      setDetailsError(errorMessage(cause))
    } finally {
      setLoadingDetailsId(null)
    }
  }

  function refreshHistory() {
    setLoading(true)
    setExpandedId(null)
    setDetails({})
    setDetailsError('')
    setVisibleCount(10)
    setRevision((previous) => previous + 1)
  }

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#E30B5D]">
              TU EVOLUCIÓN
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#2A2228]">
              Mi progreso
            </h1>
            <p className="mt-2 text-sm text-[#766A74]">
              Consulta tus sesiones finalizadas y cada serie guardada.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshHistory}
            disabled={loading}
            className={actionClass}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </header>

      <div className={`${cardClass} space-y-2`}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-[#E30B5D]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#2A2228]">
            Historial de entrenamientos
          </h2>
        </div>

        <p className="text-sm text-[#766A74]">
          {loading
            ? 'Consultando tus sesiones guardadas…'
            : `${workouts.length} ${workouts.length === 1 ? 'sesión finalizada' : 'sesiones finalizadas'}`}
        </p>

        <p className="text-xs text-[#766A74]">
          Vista de solo lectura: no elimina, modifica ni restaura registros.
          Las series aparecen con sus valores originales.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <p role="status" className="py-5 text-center text-sm text-[#766A74]">
          Cargando historial…
        </p>
      )}

      {!loading && !error && workouts.length === 0 && (
        <div className={`${cardClass} space-y-3 text-center`}>
          <Dumbbell className="mx-auto text-[#E30B5D]" size={28} aria-hidden="true" />
          <h3 className="font-bold text-[#2A2228]">Todavía no hay sesiones finalizadas</h3>
          <p className="text-sm text-[#766A74]">
            Cuando finalices un entrenamiento, aparecerá aquí con sus ejercicios y series.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('workout')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F3A4BD] px-4 font-bold text-[#2A2228]"
          >
            Ir a Entrenar
          </button>
        </div>
      )}

      {!loading && !error && workouts.slice(0, visibleCount).map((workout) => {
        const expanded = expandedId === workout.id
        const exerciseDetails = details[workout.id]
        const busy = loadingDetailsId === workout.id

        return (
          <article key={workout.id} className={`${cardClass} space-y-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#A3275A]">
                  <CalendarDays size={15} aria-hidden="true" />
                  {formatDate(workout.date)}
                </p>
                <h3 className="mt-2 break-words text-lg font-bold text-[#2A2228]">
                  {workout.routineDayNameSnapshot || 'Entrenamiento'}
                </h3>
                <p className="mt-1 text-sm text-[#766A74]">
                  {workout.routineNameSnapshot || 'Sesión registrada'}
                </p>
              </div>
              <span className="rounded-full bg-[#F2FBF5] px-3 py-1 text-xs font-semibold text-[#256345]">
                Finalizado
              </span>
            </div>

            <p className="flex items-center gap-2 text-sm text-[#766A74]">
              <Clock3 size={16} aria-hidden="true" />
              {formatDuration(workout)}
            </p>

            <button
              type="button"
              onClick={() => void toggleDetails(workout.id)}
              disabled={loadingDetailsId !== null && !expanded}
              aria-expanded={expanded}
              className={`${actionClass} w-full`}
            >
              {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              {expanded ? 'Ocultar ejercicios' : 'Ver ejercicios y series'}
            </button>

            {expanded && (
              <div className="space-y-3 border-t border-[#F3D6E2] pt-3">
                {busy && (
                  <p role="status" className="text-sm text-[#766A74]">
                    Cargando series de esta sesión…
                  </p>
                )}

                {detailsError && (
                  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {detailsError}
                  </p>
                )}

                {exerciseDetails && exerciseDetails.length === 0 && (
                  <p className="text-sm text-[#766A74]">
                    Esta sesión no tiene ejercicios registrados.
                  </p>
                )}

                {exerciseDetails && exerciseDetails.map(({ exercise, logs }, index) => (
                  <div
                    key={exercise.id}
                    className="space-y-2 rounded-xl border border-[#F3D6E2] bg-[#FFF9FC] p-3"
                  >
                    <div>
                      <h4 className="break-words text-sm font-bold text-[#2A2228]">
                        {index + 1}. {exercise.exerciseNameSnapshot}
                        {exercise.variantNameSnapshot
                          ? ` · ${exercise.variantNameSnapshot}`
                          : ''}
                      </h4>
                      <p className="mt-1 text-xs text-[#766A74]">
                        {logs.length}/{exercise.plannedSetsSnapshot} series registradas
                        {' · '}
                        {logs.length === 0
                          ? 'Sin series'
                          : logs.length < exercise.plannedSetsSnapshot
                            ? 'Realización parcial'
                            : 'Series previstas registradas'}
                      </p>
                    </div>

                    {logs.length === 0 ? (
                      <p className="text-xs text-[#766A74]">
                        No se registraron series en este ejercicio.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-[#2A2228]"
                          >
                            <span>
                              Serie {log.setNumber}
                              {log.setType === 'warmup' ? ' · Calentamiento' : ''}
                            </span>
                            <strong className="tabular-nums">
                              {formatWeight(log.weight)} × {log.reps} reps · RIR {log.rir ?? '—'}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}

      {!loading && !error && visibleCount < workouts.length && (
        <button
          type="button"
          className={`${actionClass} w-full`}
          onClick={() => setVisibleCount((previous) => previous + 10)}
        >
          Mostrar 10 sesiones más
        </button>
      )}

      <div className={`${cardClass} space-y-2`}>
        <h2 className="text-lg font-bold text-[#2A2228]">
          Mi progreso corporal
        </h2>
        <p className="text-sm text-[#766A74]">
          Próximamente: peso, medidas, fotografías y gráficos de evolución.
        </p>
      </div>
    </section>
  )
}
