
import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  ChevronRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  SkipForward,
  Timer,
  X,
} from 'lucide-react'

import type {
  Exercise,
  Routine,
  RoutineDay,
  SetLog,
  Workout,
  WorkoutExercise,
} from '../types/domain'

import { getExercises } from '../services/exerciseService'
import ExercisePicker from '../components/exercises/ExercisePicker'
import { deleteSetLog, editSetLog } from '../services/setLogEditService'
import { getRoutineDays, getRoutines } from '../services/routineService'
import { getScheduledRoutineDay } from '../services/calendarExceptionService'
import { localDateKey } from '../services/weeklyPlannerService'

import {
  addExerciseToWorkout,
  addSetLog,
  finishWorkout,
  getActiveWorkout,
  getSetLogs,
  getWorkoutExercises,
  startWorkoutFromRoutineDay,
} from '../services/workoutService'

// ========================================
// ESTILOS
// ========================================

const primary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3A4BD] px-4 py-3 font-bold text-[#2A2228] hover:bg-[#EC8EAC] disabled:opacity-50'

const secondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F3D6E2] bg-white px-4 py-2 font-semibold text-[#A3275A] hover:bg-[#FFF0F6] disabled:opacity-50'

const field =
  'min-h-12 w-full rounded-xl border border-[#EFDCE5] bg-white px-3 text-base text-[#2A2228] outline-none focus:border-[#E30B5D]'

const panel =
  'rounded-2xl border border-[#F3D6E2] bg-white p-4 shadow-sm'

// ========================================
// UTILIDADES
// ========================================

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.'
}

function duration(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// La cuenta atrás se guarda por sesión y se calcula con una hora absoluta.
// Así conserva el tiempo correcto aunque cambies de pestaña o recargues.
const REST_STORAGE_KEY = 'gym-tracker:rest-timer:v1'

type SavedRest = {
  workoutId: string
  deadline: number | null
  remaining: number
}

function getSavedRest(workoutId: string): SavedRest | null {
  try {
    const json = window.localStorage.getItem(REST_STORAGE_KEY)
    if (!json) return null
    const value: unknown = JSON.parse(json)
    if (!value || typeof value !== 'object') return null
    const rest = value as Partial<SavedRest>
    if (rest.workoutId !== workoutId) return null
    if (
      (rest.deadline !== null &&
        (typeof rest.deadline !== 'number' || !Number.isFinite(rest.deadline))) ||
      typeof rest.remaining !== 'number' ||
      !Number.isFinite(rest.remaining) ||
      rest.remaining < 0 ||
      rest.remaining > 900 * 60
    ) return null
    if (rest.deadline === null && rest.remaining === 0) return null
    return rest as SavedRest
  } catch {
    return null
  }
}

function storeRest(rest: SavedRest | null) {
  try {
    if (rest) {
      window.localStorage.setItem(REST_STORAGE_KEY, JSON.stringify(rest))
    } else {
      window.localStorage.removeItem(REST_STORAGE_KEY)
    }
  } catch {
    // Si el navegador restringe localStorage, el cronómetro sigue en pantalla.
  }
}

function adjustValue(value: string, by: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  const base = value.trim() !== '' && Number.isFinite(parsed) ? parsed : minimum
  const changed = Math.min(maximum, Math.max(minimum, base + by))
  return String(Math.round(changed * 100) / 100)
}

type SessionData = {
  exercises: WorkoutExercise[]
  logs: Record<string, SetLog[]>
}

// ========================================
// LEER ENTRENAMIENTO COMPLETO
// ========================================

async function readSession(
  workoutId: string,
): Promise<SessionData> {
  const exercises = await getWorkoutExercises(workoutId)

  const pairs = await Promise.all(
    exercises.map(async (exercise) =>
      [exercise.id, await getSetLogs(exercise.id)] as const,
    ),
  )

  return {
    exercises,
    logs: Object.fromEntries(pairs) as Record<string, SetLog[]>,
  }
}

// ========================================
// PÁGINA DE ENTRENAMIENTO
// ========================================

export default function WorkoutPage() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ======================================
  // RUTINAS Y BIBLIOTECA
  // ======================================

  const [routines, setRoutines] = useState<Routine[]>([])
  const [routineId, setRoutineId] = useState('')

  const [days, setDays] = useState<RoutineDay[]>([])
  const [dayId, setDayId] = useState('')

  const [library, setLibrary] = useState<Exercise[]>([])

  // ======================================
  // ENTRENAMIENTO ACTIVO
  // ======================================

  const [workout, setWorkout] = useState<Workout | null>(null)

  const [sessionExercises, setSessionExercises] =
    useState<WorkoutExercise[]>([])

  const [logsByExercise, setLogsByExercise] =
    useState<Record<string, SetLog[]>>({})

  const [selectedExerciseId, setSelectedExerciseId] =
    useState('')

  // ======================================
  // REGISTRO DE SERIES
  // ======================================

  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState('')

  // Corregir una serie sin perder los demás registros.
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [editRir, setEditRir] = useState('')
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null)

  // ======================================
  // AÑADIR EJERCICIO
  // ======================================

  const [showAdd, setShowAdd] = useState(false)
  const [newExerciseId, setNewExerciseId] = useState('')

  const [newSets, setNewSets] = useState(3)
  const [newMinReps, setNewMinReps] = useState(8)
  const [newMaxReps, setNewMaxReps] = useState(12)
  const [newRir, setNewRir] = useState(2)
  const [newRest, setNewRest] = useState(120)

  // ======================================
  // FINALIZAR Y DESCANSO
  // ======================================

  const [confirmFinish, setConfirmFinish] = useState(false)

  const [restDeadline, setRestDeadline] =
    useState<number | null>(null)

  const [restRemaining, setRestRemaining] = useState(0)

  // ======================================
  // SELECCIONAR EJERCICIO
  // ======================================

  const chooseExercise = useCallback(
    (item: WorkoutExercise, logs: SetLog[]) => {
      setSelectedExerciseId(item.id)
      setEditingLogId(null)
      setConfirmDeleteLogId(null)

      // Reutilizamos los tres valores de la última serie, no solo el peso.
      // En el primer registro usamos el objetivo de la rutina.
      const last = logs[logs.length - 1]
      setWeight(last ? String(last.weight) : '')
      setReps(String(last ? last.reps : item.maxRepsSnapshot))
      setRir(String(last?.rir ?? item.targetRIRSnapshot ?? 2))
    },
    [],
  )

  // ======================================
  // ACTUALIZAR DATOS DE LA SESIÓN
  // ======================================

  const refreshSession = useCallback(
    async (
      current: Workout,
      preferredExerciseId?: string,
    ) => {
      const data = await readSession(current.id)

      setWorkout(current)
      setSessionExercises(data.exercises)
      setLogsByExercise(data.logs)

      const selected =
        data.exercises.find(
          (item) => item.id === preferredExerciseId,
        ) ?? data.exercises[0]

      if (selected) {
        chooseExercise(
          selected,
          data.logs[selected.id] ?? [],
        )
      } else {
        setSelectedExerciseId('')
      }
    },
    [chooseExercise],
  )

  // ======================================
  // CARGA INICIAL
  // ======================================

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        const [active, options, exercises] =
          await Promise.all([
            getActiveWorkout(),
            getRoutines(),
            getExercises(),
          ])

        if (cancelled) return

        setRoutines(options)
        setLibrary(exercises)

        setRoutineId(
          options.find((item) => item.active)?.id ??
            options[0]?.id ??
            '',
        )

        if (active) {
          await refreshSession(active)
          if (cancelled) return
          const saved = getSavedRest(active.id)
          if (saved) {
            setRestDeadline(saved.deadline)
            setRestRemaining(
              saved.deadline === null
                ? saved.remaining
                : Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)),
            )
          }
        } else {
          // No reactivar descansos de sesiones que ya terminaron.
          storeRest(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(errorText(cause))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  // ======================================
  // CARGAR DÍAS DE LA RUTINA
  // ======================================

  useEffect(() => {
    let cancelled = false

    async function loadDays() {
      try {
        const result = routineId
          ? await getRoutineDays(routineId)
          : await Promise.resolve([])

        const scheduled = routineId
          ? await getScheduledRoutineDay(routineId, localDateKey(new Date()), result)
          : undefined

        if (cancelled) return

        setDays(result)

        setDayId((previous) =>
          result.some((day) => day.id === previous)
            ? previous
            : (scheduled?.id ?? ''),
        )
      } catch (cause) {
        if (!cancelled) {
          setError(errorText(cause))
        }
      }
    }

    void loadDays()

    return () => {
      cancelled = true
    }
  }, [routineId])

  // ======================================
  // CRONÓMETRO
  // ======================================

  useEffect(() => {
    if (restDeadline === null) return

    const tick = () => {
      setRestRemaining(
        Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000)),
      )
    }
    // Inmediatamente al regresar a Entrenar (no esperar al primer intervalo).
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [restDeadline])

  // ======================================
  // DATOS DERIVADOS
  // ======================================

  const visibleDays = days.filter(
    (day) => day.routineId === routineId,
  )

  const currentExercise = sessionExercises.find(
    (item) => item.id === selectedExerciseId,
  )

  const currentLogs = currentExercise
    ? logsByExercise[currentExercise.id] ?? []
    : []

  const nextSet = currentExercise
    ? Array.from(
        { length: currentExercise.plannedSetsSnapshot },
        (_, i) => i + 1,
      ).find(
        (number) =>
          !currentLogs.some(
            (item) => item.setNumber === number,
          ),
      )
    : undefined


  // ======================================
  // EJECUTAR ACCIONES
  // ======================================

  async function runAction(
    action: () => Promise<void>,
  ) {
    if (busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await action()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  function resetRest() {
    setRestDeadline(null)
    setRestRemaining(0)
    storeRest(null)
  }

  function startRest(workoutId: string, seconds: number) {
    if (seconds <= 0) {
      resetRest()
      return
    }
    const deadline = Date.now() + seconds * 1000
    setRestDeadline(deadline)
    setRestRemaining(seconds)
    storeRest({ workoutId, deadline, remaining: seconds })
  }

  function pauseRest() {
    if (!workout || restDeadline === null) return
    const seconds = Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000))
    setRestDeadline(null)
    setRestRemaining(seconds)
    storeRest(seconds > 0 ? { workoutId: workout.id, deadline: null, remaining: seconds } : null)
  }

  function resumeRest() {
    if (!workout || restRemaining <= 0) return
    const deadline = Date.now() + restRemaining * 1000
    setRestDeadline(deadline)
    storeRest({ workoutId: workout.id, deadline, remaining: restRemaining })
  }

  function extendRest() {
    if (!workout) return
    const remaining = restDeadline === null
      ? restRemaining
      : Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000))
    const next = remaining + 30
    const deadline = restDeadline === null ? null : Date.now() + next * 1000
    setRestDeadline(deadline)
    setRestRemaining(next)
    storeRest({ workoutId: workout.id, deadline, remaining: next })
  }

  // ======================================
  // CORREGIR / ELIMINAR SERIES
  // ======================================

  function beginEditLog(log: SetLog) {
    setConfirmDeleteLogId(null)
    setEditingLogId(log.id)
    setEditWeight(String(log.weight))
    setEditReps(String(log.reps))
    setEditRir(String(log.rir ?? 0))
  }

  function cancelLogChanges() {
    setEditingLogId(null)
    setConfirmDeleteLogId(null)
  }

  async function saveLogChanges(log: SetLog) {
    if (!workout || !currentExercise || editingLogId !== log.id) return

    if (!editWeight.trim() || !editReps.trim() || !editRir.trim()) {
      throw new Error('Completa peso, repeticiones y RIR.')
    }

    await editSetLog(log.id, {
      weight: Number(editWeight),
      reps: Number(editReps),
      rir: Number(editRir),
    })

    await refreshSession(workout, currentExercise.id)
    setNotice(`Serie ${log.setNumber} corregida.`)
    // Corregir no reinicia ni modifica el descanso en curso.
  }

  async function removeLog(log: SetLog) {
    if (!workout || !currentExercise || confirmDeleteLogId !== log.id) return

    await deleteSetLog(log.id)
    await refreshSession(workout, currentExercise.id)
    setNotice(`Serie ${log.setNumber} eliminada. Puedes registrarla nuevamente.`)
    // No se modifica el cronómetro, ni se eliminan otras series.
  }

  // ======================================
  // ESTADO DE CARGA
  // ======================================

  if (loading) {
    return (
      <p
        role="status"
        className="py-8 text-center"
      >
        Cargando entrenamiento…
      </p>
    )
  }

  // ======================================
  // INTERFAZ
  // ======================================

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 pb-24 text-[#2A2228]">

      {/* ENCABEZADO */}

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#E30B5D]">
          GYM TRACKER
        </p>

        <h1 className="text-3xl font-extrabold">
          Entrenar
        </h1>

        <p className="mt-1 text-sm text-[#766A74]">
          Tu sesión, tus ejercicios y cada serie guardada.
        </p>
      </header>

      {/* MENSAJES */}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      {/* ==================================
          SELECCIONAR RUTINA
      ================================== */}

      {!workout ? (
        <div className={`${panel} space-y-4`}>
          <h2 className="text-lg font-bold">
            ¿Qué quieres entrenar hoy?
          </h2>

          {routines.length === 0 ? (
            <p className="text-sm text-[#766A74]">
              Primero crea una rutina y añádele días y
              ejercicios desde la pestaña Rutinas.
            </p>
          ) : (
            <>
              <label className="block space-y-1 text-sm font-semibold">
                <span>Rutina</span>

                <select
                  className={field}
                  value={routineId}
                  onChange={(e) =>
                    setRoutineId(e.target.value)
                  }
                >
                  {routines.map((routine) => (
                    <option
                      key={routine.id}
                      value={routine.id}
                    >
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm font-semibold">
                <span>Día de entrenamiento</span>

                <select
                  className={field}
                  value={
                    visibleDays.some(
                      (day) => day.id === dayId,
                    )
                      ? dayId
                      : ''
                  }
                  onChange={(e) =>
                    setDayId(e.target.value)
                  }
                >
                  <option value="">
                    {visibleDays.length === 0 ? 'No hay días configurados' : 'Selecciona un día de rutina'}
                  </option>

                  {visibleDays.map((day) => (
                    <option
                      key={day.id}
                      value={day.id}
                    >
                      {day.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className={`${primary} w-full`}
                disabled={
                  busy ||
                  !visibleDays.some(
                    (day) => day.id === dayId,
                  )
                }
                onClick={() =>
                  void runAction(async () => {
                    const started =
                      await startWorkoutFromRoutineDay(
                        dayId,
                      )

                    await refreshSession(started)

                    resetRest()

                    setNotice(
                      'Entrenamiento iniciado.',
                    )
                  })
                }
              >
                <Play size={18} />
                Iniciar entrenamiento
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* ==============================
              SESIÓN ACTIVA
          ============================== */}

          <div className={`${panel} space-y-2`}>
            <p className="text-xs font-bold uppercase text-[#E30B5D]">
              ENTRENAMIENTO EN CURSO
            </p>

            <h2 className="text-xl font-extrabold">
              {workout.routineDayNameSnapshot ??
                'Entrenamiento en curso'}
            </h2>

            <p className="text-sm text-[#766A74]">
              {workout.routineNameSnapshot ??
                'Sesión anterior'}{' '}
              · {sessionExercises.length} ejercicios
            </p>

            {/* SELECCIÓN DE EJERCICIOS */}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sessionExercises.map((item, index) => {
                const completed =
                  (logsByExercise[item.id] ?? []).length

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={
                      selectedExerciseId === item.id
                    }
                    className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm ${
                      selectedExerciseId === item.id
                        ? 'border-[#E30B5D] bg-[#FFF0F6]'
                        : 'border-[#F3D6E2] bg-white'
                    }`}
                    onClick={() =>
                      chooseExercise(
                        item,
                        logsByExercise[item.id] ?? [],
                      )
                    }
                  >
                    <span className="min-w-0">
                      <strong className="block break-words">
                        {index + 1}.{' '}
                        {item.exerciseNameSnapshot}
                      </strong>

                      <span className="text-xs text-[#766A74]">
                        {completed}/{item.plannedSetsSnapshot}{' '}
                        series
                      </span>
                    </span>

                    {completed >=
                    item.plannedSetsSnapshot ? (
                      <Check
                        size={18}
                        className="shrink-0 text-green-700"
                      />
                    ) : (
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-[#E30B5D]"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ==============================
              REGISTRO DE SERIES
          ============================== */}

          {currentExercise && (
            <div className={`${panel} space-y-4`}>
              <div>
                <h3 className="text-xl font-bold">
                  {currentExercise.exerciseNameSnapshot}
                </h3>

                <p className="text-sm text-[#766A74]">
                  {currentExercise.plannedSetsSnapshot}{' '}
                  series ·{' '}
                  {currentExercise.minRepsSnapshot}–
                  {currentExercise.maxRepsSnapshot} reps
                  {' · '}RIR{' '}
                  {currentExercise.targetRIRSnapshot ??
                    '—'}
                  {' · '}
                  {duration(
                    currentExercise.restSecondsSnapshot,
                  )}{' '}
                  descanso
                </p>
              </div>

              {/* SERIES YA GUARDADAS */}

              {currentLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold">
                    Series guardadas
                  </p>

                  {currentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="space-y-3 rounded-xl bg-[#FFF9FC] p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">Serie {log.setNumber}</span>
                        <strong>
                          {log.weight} kg × {log.reps} · RIR {log.rir ?? '—'}
                        </strong>
                      </div>

                      {editingLogId === log.id ? (
                        <form
                          className="space-y-3 rounded-xl border border-[#F3D6E2] bg-white p-3"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void runAction(() => saveLogChanges(log))
                          }}
                        >
                          <p className="font-bold">Corregir serie {log.setNumber}</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <label className="space-y-1">
                              <span className="block font-semibold">Peso (kg)</span>
                              <input
                                aria-label={`Peso de la serie ${log.setNumber}`}
                                className={field}
                                type="number"
                                min="0"
                                max="1000"
                                step="any"
                                inputMode="decimal"
                                required
                                disabled={busy}
                                value={editWeight}
                                onChange={(event) => setEditWeight(event.target.value)}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block font-semibold">Repeticiones</span>
                              <input
                                aria-label={`Repeticiones de la serie ${log.setNumber}`}
                                className={field}
                                type="number"
                                min="1"
                                max="100"
                                step="1"
                                inputMode="numeric"
                                required
                                disabled={busy}
                                value={editReps}
                                onChange={(event) => setEditReps(event.target.value)}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block font-semibold">RIR</span>
                              <select
                                aria-label={`RIR de la serie ${log.setNumber}`}
                                className={field}
                                disabled={busy}
                                value={editRir}
                                onChange={(event) => setEditRir(event.target.value)}
                              >
                                {Array.from({ length: 11 }, (_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" className={primary} disabled={busy}>
                              <Check size={16} /> Guardar cambios
                            </button>
                            <button type="button" className={secondary} disabled={busy} onClick={cancelLogChanges}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : confirmDeleteLogId === log.id ? (
                        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                          <p className="font-bold text-red-800">
                            ¿Eliminar la serie {log.setNumber}?
                          </p>
                          <p className="text-red-800">
                            Las demás series se conservarán. Esta serie dejará de aparecer en el historial.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                              disabled={busy}
                              onClick={() => void runAction(() => removeLog(log))}
                            >
                              <Trash2 size={16} /> Sí, eliminar
                            </button>
                            <button type="button" className={secondary} disabled={busy} onClick={cancelLogChanges}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`${secondary} min-h-10 px-3 py-2 text-xs`}
                            disabled={busy || editingLogId !== null || confirmDeleteLogId !== null}
                            onClick={() => beginEditLog(log)}
                          >
                            <Pencil size={15} /> Editar
                          </button>
                          <button
                            type="button"
                            className={`${secondary} min-h-10 px-3 py-2 text-xs`}
                            disabled={busy || editingLogId !== null || confirmDeleteLogId !== null}
                            onClick={() => {
                              setEditingLogId(null)
                              setConfirmDeleteLogId(log.id)
                            }}
                          >
                            <Trash2 size={15} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* NUEVA SERIE */}

              {nextSet !== undefined ? (
                <form
                  className="space-y-3 rounded-xl bg-[#FFF9FC] p-3"
                  onSubmit={(event) => {
                    event.preventDefault()

                    void runAction(async () => {
                      if (
                        !currentExercise ||
                        nextSet === undefined
                      ) {
                        return
                      }

                      if (
                        !weight.trim() ||
                        !reps.trim() ||
                        !rir.trim()
                      ) {
                        throw new Error(
                          'Completa peso, repeticiones y RIR.',
                        )
                      }

                      const kg = Number(weight)
                      const count = Number(reps)
                      const reserve = Number(rir)

                      if (
                        !Number.isFinite(kg) ||
                        kg < 0 ||
                        !Number.isInteger(count) ||
                        count < 1 ||
                        !Number.isInteger(reserve) ||
                        reserve < 0 ||
                        reserve > 10
                      ) {
                        throw new Error(
                          'Revisa el peso, las repeticiones y el RIR.',
                        )
                      }

                      await addSetLog({
                        workoutExerciseId:
                          currentExercise.id,
                        setNumber: nextSet,
                        weight: kg,
                        reps: count,
                        rir: reserve,
                        setType: 'working',
                      })

                      await refreshSession(
                        workout,
                        currentExercise.id,
                      )

                      // Inicia automáticamente el descanso configurado.
                      startRest(workout.id, currentExercise.restSecondsSnapshot)

                      setNotice(
                        `Serie ${nextSet} guardada.`,
                      )
                    })
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold">
                      Registrar serie {nextSet}
                    </h4>
                    {currentLogs.length > 0 && (
                      <span className="text-xs text-[#766A74]">
                        Valores copiados de la serie anterior · puedes editarlos
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-sm font-semibold">
                      <span className="block">
                        Peso (kg)
                      </span>

                      <input
                        className={field}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        value={weight}
                        onChange={(e) =>
                          setWeight(e.target.value)
                        }
                        placeholder="Ej.: 60"
                        required
                      />
                      <div className="mt-1 flex gap-2">
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Restar 2,5 kilos" onClick={() => setWeight(v => adjustValue(v, -2.5, 0, 1000))}>−2,5</button>
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Sumar 2,5 kilos" onClick={() => setWeight(v => adjustValue(v, 2.5, 0, 1000))}>+2,5</button>
                      </div>
                    </label>

                    <label className="space-y-1 text-sm font-semibold">
                      <span className="block">
                        Repeticiones
                      </span>

                      <input
                        className={field}
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="1"
                        value={reps}
                        onChange={(e) =>
                          setReps(e.target.value)
                        }
                        required
                      />
                      <div className="mt-1 flex gap-2">
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Restar una repetición" onClick={() => setReps(v => adjustValue(v, -1, 1, 100))}>−1</button>
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Sumar una repetición" onClick={() => setReps(v => adjustValue(v, 1, 1, 100))}>+1</button>
                      </div>
                    </label>

                    <label className="space-y-1 text-sm font-semibold">
                      <span className="block">
                        RIR
                      </span>

                      <select
                        className={field}
                        value={rir}
                        onChange={(e) =>
                          setRir(e.target.value)
                        }
                      >
                        {Array.from(
                          { length: 11 },
                          (_, i) => (
                            <option
                              value={i}
                              key={i}
                            >
                              {i}
                            </option>
                          ),
                        )}
                      </select>
                      <div className="mt-1 flex gap-2">
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Restar un RIR" onClick={() => setRir(v => adjustValue(v, -1, 0, 10))}>−1</button>
                        <button type="button" className={`${secondary} min-h-10 flex-1 px-2 py-1 text-sm`} disabled={busy}
                          aria-label="Sumar un RIR" onClick={() => setRir(v => adjustValue(v, 1, 0, 10))}>+1</button>
                      </div>
                    </label>
                  </div>

                  <button
                    className={`${primary} w-full`}
                    disabled={busy}
                    type="submit"
                  >
                    <Check size={18} />
                    Guardar serie
                  </button>
                </form>
              ) : (
                <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
                  Todas las series previstas de este
                  ejercicio están guardadas.
                </p>
              )}
            </div>
          )}

          {/* ==============================
              CRONÓMETRO DE DESCANSO
          ============================== */}

          {restDeadline !== null && (
            <div className={`${panel} space-y-2`}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Timer size={18} />
                Descanso{' '}
                {restRemaining === 0
                  ? 'terminado'
                  : 'en curso'}
              </p>

              <p aria-live={restRemaining === 0 ? 'polite' : 'off'}
                className="text-center text-3xl font-extrabold tabular-nums text-[#E30B5D]">
                {duration(restRemaining)}
              </p>
              <p className="text-center text-xs text-[#766A74]">
                El tiempo se conserva si cambias de sección o actualizas la página.
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {restRemaining > 0 && (
                  <button
                    type="button"
                    className={secondary}
                    onClick={pauseRest}
                  >
                    <Pause size={16} />
                    Pausar
                  </button>
                )}

                <button
                  type="button"
                  className={secondary}
                  onClick={extendRest}
                >
                  +30 s
                </button>

                <button
                  type="button"
                  className={secondary}
                  onClick={resetRest}
                >
                  <SkipForward size={16} />
                  Saltar
                </button>
              </div>
            </div>
          )}

          {/* DESCANSO PAUSADO */}

          {restDeadline === null &&
            restRemaining > 0 && (
              <div className={`${panel} space-y-2`}>
                <p className="font-bold">
                  Descanso pausado ·{' '}
                  {duration(restRemaining)}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondary}
                    onClick={resumeRest}
                  >
                    <Play size={16} />
                    Reanudar
                  </button>

                  <button
                    type="button"
                    className={secondary}
                    onClick={extendRest}
                  >
                    +30 s
                  </button>

                  <button
                    type="button"
                    className={secondary}
                    onClick={resetRest}
                  >
                    <SkipForward size={16} />
                    Saltar
                  </button>
                </div>
              </div>
            )}

          {/* ==============================
              AÑADIR EJERCICIO
          ============================== */}

          <div className={`${panel} space-y-3`}>
            <button
              type="button"
              className={secondary}
              disabled={busy}
              onClick={() =>
                setShowAdd(
                  (previous) => !previous,
                )
              }
            >
              <Plus size={17} />
              Añadir ejercicio a esta sesión
            </button>

            {showAdd && (
              <div className="space-y-3 rounded-xl bg-[#FFF9FC] p-3">
                <p className="text-xs text-[#766A74]">
                  No modifica tu rutina original.
                </p>

                <ExercisePicker
                  library={library}
                  value={newExerciseId}
                  onChange={setNewExerciseId}
                />

                {/* CONFIGURACIÓN RÁPIDA */}

                {newExerciseId && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(
                      [
                        [
                          'Series',
                          newSets,
                          setNewSets,
                          1,
                          15,
                        ],
                        [
                          'Reps mín.',
                          newMinReps,
                          setNewMinReps,
                          1,
                          100,
                        ],
                        [
                          'Reps máx.',
                          newMaxReps,
                          setNewMaxReps,
                          1,
                          100,
                        ],
                        [
                          'RIR',
                          newRir,
                          setNewRir,
                          0,
                          10,
                        ],
                        [
                          'Descanso (s)',
                          newRest,
                          setNewRest,
                          0,
                          900,
                        ],
                      ] as const
                    ).map(
                      ([
                        label,
                        value,
                        setter,
                        min,
                        max,
                      ]) => (
                        <label
                          key={label}
                          className="space-y-1 text-xs font-semibold"
                        >
                          <span className="block">
                            {label}
                          </span>

                          <input
                            className={field}
                            type="number"
                            min={min}
                            max={max}
                            step="1"
                            value={value}
                            onChange={(e) =>
                              setter(
                                Number(
                                  e.target.value,
                                ),
                              )
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className={`${primary} w-full`}
                  disabled={
                    busy ||
                    !newExerciseId ||
                    newMinReps > newMaxReps
                  }
                  onClick={() =>
                    void runAction(async () => {
                      const added =
                        await addExerciseToWorkout({
                          workoutId: workout.id,
                          exerciseId: newExerciseId,
                          sets: newSets,
                          minReps: newMinReps,
                          maxReps: newMaxReps,
                          targetRIR: newRir,
                          restSeconds: newRest,
                        })

                      await refreshSession(
                        workout,
                        added.id,
                      )

                      setShowAdd(false)
                      setNewExerciseId('')

                      setNotice(
                        'Ejercicio añadido a la sesión.',
                      )
                    })
                  }
                >
                  <Plus size={17} />
                  Añadir ejercicio
                </button>
              </div>
            )}
          </div>

          {/* ==============================
              FINALIZAR ENTRENAMIENTO
          ============================== */}

          <div className={`${panel} space-y-3`}>
            {!confirmFinish ? (
              <button
                type="button"
                className="min-h-12 w-full rounded-xl bg-[#E30B5D] px-4 py-3 font-bold text-white disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  setConfirmFinish(true)
                }
              >
                Finalizar entrenamiento
              </button>
            ) : (
              <div className="space-y-2">
                <p className="font-bold">
                  ¿Finalizar y guardar este entrenamiento?
                </p>

                <p className="text-sm text-[#766A74]">
                  Se guardarán las series registradas.
                  Los ejercicios sin series quedarán omitidos.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-xl bg-[#E30B5D] px-4 font-bold text-white disabled:opacity-50"
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        await finishWorkout(
                          workout.id,
                        )

                        setWorkout(null)
                        setSessionExercises([])
                        setLogsByExercise({})
                        setSelectedExerciseId('')
                        setShowAdd(false)
                        setConfirmFinish(false)

                        resetRest()

                        setNotice(
                          'Entrenamiento finalizado y guardado en el historial.',
                        )
                      })
                    }
                  >
                    Sí, finalizar
                  </button>

                  <button
                    type="button"
                    className={secondary}
                    disabled={busy}
                    onClick={() =>
                      setConfirmFinish(false)
                    }
                  >
                    <X size={16} />
                    Continuar entrenando
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
