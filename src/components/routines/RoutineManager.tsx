
import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import type {
  Exercise,
  Routine,
  RoutineDay,
  RoutineExercise,
} from '../../types/domain'

import { getExercises } from '../../services/exerciseService'
import ExercisePicker from '../exercises/ExercisePicker'

import {
  createRoutine,
  createRoutineDay,
  createRoutineExercise,
  deleteRoutine,
  deleteRoutineDay,
  deleteRoutineExercise,
  getDeletedRoutineDays,
  getDeletedRoutineExercises,
  getDeletedRoutines,
  getRoutineDays,
  getRoutineExercises,
  getRoutines,
  restoreRoutine,
  restoreRoutineDay,
  restoreRoutineExercise,
  updateRoutine,
  updateRoutineDay,
  updateRoutineExercise,
} from '../../services/routineService'

const primary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3A4BD] px-4 py-2 text-sm font-bold text-[#2A2228] hover:bg-[#EC8EAC] disabled:opacity-50'

const secondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F3D6E2] bg-white px-3 py-2 text-sm font-semibold text-[#A3275A] hover:bg-[#FFF0F6] disabled:opacity-50'

const input =
  'min-h-11 w-full rounded-xl border border-[#EFDCE5] bg-white px-3 py-2 text-base text-[#2A2228] outline-none focus:border-[#E30B5D]'

const panel =
  'rounded-2xl border border-[#F3D6E2] bg-white p-4 shadow-sm'

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.'
}

function timeLabel(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

type CounterProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (value: number) => void
}

function Counter({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: CounterProps) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-semibold text-[#766A74]">
        {label}
      </span>

      <div className="flex items-center justify-between gap-1 rounded-xl border border-[#EFDCE5] bg-white p-1">
        <button
          type="button"
          aria-label={`Reducir ${label}`}
          className="min-h-10 min-w-10 rounded-lg bg-[#FFF0F6] font-bold text-[#A3275A] disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>

        <span className="text-sm font-bold tabular-nums">
          {format ? format(value) : value}
        </span>

        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          className="min-h-10 min-w-10 rounded-lg bg-[#FFF0F6] font-bold text-[#A3275A] disabled:opacity-30"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function RoutineManager() {
  // ======================================
  // DATOS
  // ======================================

  const [routines, setRoutines] = useState<Routine[]>([])
  const [trashRoutines, setTrashRoutines] = useState<Routine[]>([])
  const [library, setLibrary] = useState<Exercise[]>([])
  const [routineId, setRoutineId] = useState('')

  const [days, setDays] = useState<RoutineDay[]>([])
  const [trashDays, setTrashDays] = useState<RoutineDay[]>([])
  const [dayId, setDayId] = useState('')

  const [items, setItems] = useState<RoutineExercise[]>([])
  const [trashItems, setTrashItems] = useState<RoutineExercise[]>([])

  // ======================================
  // ESTADOS DE INTERFAZ
  // ======================================

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')

  // ======================================
  // FORMULARIO DE RUTINA
  // ======================================

  const [routineForm, setRoutineForm] = useState(false)
  const [editRoutineId, setEditRoutineId] = useState('')
  const [routineName, setRoutineName] = useState('')
  const [routineDescription, setRoutineDescription] = useState('')

  // ======================================
  // FORMULARIO DE DÍA
  // ======================================

  const [dayForm, setDayForm] = useState(false)
  const [editDayId, setEditDayId] = useState('')
  const [dayName, setDayName] = useState('')

  // ======================================
  // FORMULARIO DE EJERCICIO
  // ======================================

  const [exerciseForm, setExerciseForm] = useState(false)
  const [editItemId, setEditItemId] = useState('')
  const [exerciseId, setExerciseId] = useState('')
  const [sets, setSets] = useState(3)
  const [minReps, setMinReps] = useState(8)
  const [maxReps, setMaxReps] = useState(12)
  const [rir, setRir] = useState(2)
  const [rest, setRest] = useState(120)

  // ======================================
  // CARGAR RUTINAS
  // ======================================

  const loadRoutines = useCallback(async () => {
    const [active, deleted, exercises] = await Promise.all([
      getRoutines(),
      getDeletedRoutines(),
      getExercises(),
    ])

    setRoutines(active)
    setTrashRoutines(deleted)
    setLibrary(exercises)

    setRoutineId((previous) =>
      active.some((r) => r.id === previous)
        ? previous
        : (active[0]?.id ?? ''),
    )
  }, [])

  // ======================================
  // REFRESCAR DÍAS TRAS UNA ACCIÓN
  // ======================================

  const loadDays = useCallback(async (id: string) => {
    if (!id) {
      setDays([])
      setTrashDays([])
      setDayId('')
      return
    }

    const [active, deleted] = await Promise.all([
      getRoutineDays(id),
      getDeletedRoutineDays(id),
    ])

    setDays(active)
    setTrashDays(deleted)

    setDayId((previous) =>
      active.some((d) => d.id === previous)
        ? previous
        : (active[0]?.id ?? ''),
    )
  }, [])

  // ======================================
  // REFRESCAR EJERCICIOS TRAS UNA ACCIÓN
  // ======================================

  const loadItems = useCallback(async (id: string) => {
    if (!id) {
      setItems([])
      setTrashItems([])
      return
    }

    const [active, deleted] = await Promise.all([
      getRoutineExercises(id),
      getDeletedRoutineExercises(id),
    ])

    setItems(active)
    setTrashItems(deleted)
  }, [])

  // ======================================
  // CARGA INICIAL
  // ======================================

  useEffect(() => {
    let current = true

    async function load() {
      try {
        await loadRoutines()
      } catch (cause) {
        if (current) {
          setError(message(cause))
        }
      } finally {
        if (current) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      current = false
    }
  }, [loadRoutines])

  // ======================================
  // EFECTO ASÍNCRONO PARA DÍAS
  // ======================================

  useEffect(() => {
    let cancelled = false

    async function fetchDays() {
      try {
        const [active, deleted] = routineId
          ? await Promise.all([
              getRoutineDays(routineId),
              getDeletedRoutineDays(routineId),
            ])
          : await Promise.resolve(
              [[], []] as [RoutineDay[], RoutineDay[]],
            )

        if (cancelled) return

        setDays(active)
        setTrashDays(deleted)

        setDayId((previous) =>
          active.some((day) => day.id === previous)
            ? previous
            : (active[0]?.id ?? ''),
        )
      } catch (cause) {
        if (!cancelled) {
          setError(message(cause))
        }
      }
    }

    void fetchDays()

    return () => {
      cancelled = true
    }
  }, [routineId])

  // ======================================
  // EFECTO ASÍNCRONO PARA EJERCICIOS
  // ======================================

  useEffect(() => {
    let cancelled = false

    async function fetchItems() {
      try {
        const [active, deleted] = dayId
          ? await Promise.all([
              getRoutineExercises(dayId),
              getDeletedRoutineExercises(dayId),
            ])
          : await Promise.resolve(
              [[], []] as [RoutineExercise[], RoutineExercise[]],
            )

        if (cancelled) return

        setItems(active)
        setTrashItems(deleted)
      } catch (cause) {
        if (!cancelled) {
          setError(message(cause))
        }
      }
    }

    void fetchItems()

    return () => {
      cancelled = true
    }
  }, [dayId])

  // ======================================
  // OPERACIONES CON CONTROL DE ERRORES
  // ======================================

  async function perform(
    operation: () => Promise<void>,
    success: string,
  ) {
    if (busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await operation()
      setNotice(success)
      setConfirmDelete('')
    } catch (cause) {
      setError(message(cause))
    } finally {
      setBusy(false)
    }
  }

  // ======================================
  // PREPARAR FORMULARIOS
  // ======================================

  function startRoutineEdit(routine: Routine) {
    setEditRoutineId(routine.id)
    setRoutineName(routine.name)
    setRoutineDescription(routine.description ?? '')
    setRoutineForm(true)
  }

  function startRoutineCreate() {
    setEditRoutineId('')
    setRoutineName('')
    setRoutineDescription('')
    setRoutineForm(true)
  }

  function startDayCreate() {
    setEditDayId('')
    setDayName('')
    setDayForm(true)
  }

  function startDayEdit(day: RoutineDay) {
    setEditDayId(day.id)
    setDayName(day.name)
    setDayForm(true)
  }

  function startExerciseCreate() {
    setEditItemId('')
    setExerciseId('')
    setSets(3)
    setMinReps(8)
    setMaxReps(12)
    setRir(2)
    setRest(120)
    setExerciseForm(true)
  }

  function startExerciseEdit(item: RoutineExercise) {
    setEditItemId(item.id)
    setExerciseId(item.exerciseId)
    setSets(item.sets)
    setMinReps(item.minReps)
    setMaxReps(item.maxReps)
    setRir(item.targetRIR ?? 2)
    setRest(item.restSeconds)
    setExerciseForm(true)
  }

  // ======================================
  // ELEMENTOS SELECCIONADOS
  // ======================================

  const selectedRoutine = routines.find(
    (r) => r.id === routineId,
  )

  const selectedDay = days.find(
    (d) => d.id === dayId && d.routineId === routineId,
  )

  const exerciseName = (id: string) =>
    library.find((e) => e.id === id)?.name ??
    'Ejercicio no disponible'

  if (loading) {
    return (
      <p role="status" className="p-5">
        Cargando rutinas…
      </p>
    )
  }

  // ======================================
  // INTERFAZ PRINCIPAL
  // ======================================

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 pb-24 text-[#2A2228]">

      {/* ENCABEZADO */}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#E30B5D]">
            Planifica tu entrenamiento
          </p>

          <h1 className="mt-1 text-3xl font-extrabold">
            Mis rutinas
          </h1>

          <p className="mt-2 text-sm text-[#766A74]">
            Rutina → días → ejercicios.
            Todo se guarda en tu dispositivo.
          </p>
        </div>

        <button
          type="button"
          className={primary}
          disabled={busy}
          onClick={startRoutineCreate}
        >
          <Plus size={18} />
          Nueva rutina
        </button>
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

      {/* CREAR O EDITAR RUTINA */}

      {routineForm && (
        <form
          className={`${panel} space-y-3`}
          onSubmit={(event) => {
            event.preventDefault()

            void perform(async () => {
              if (editRoutineId) {
                await updateRoutine(editRoutineId, {
                  name: routineName,
                  description: routineDescription,
                })
              } else {
                const created = await createRoutine({
                  name: routineName,
                  description: routineDescription,
                  active: false,
                })

                setRoutineId(created.id)
              }

              await loadRoutines()
              setRoutineForm(false)
            }, editRoutineId ? 'Rutina actualizada.' : 'Rutina creada.')
          }}
        >
          <h2 className="text-lg font-bold">
            {editRoutineId ? 'Editar rutina' : 'Nueva rutina'}
          </h2>

          <label className="block space-y-1 text-sm font-semibold">
            Nombre

            <input
              className={input}
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              maxLength={80}
              placeholder="Ej.: Rutina principal"
              required
            />
          </label>

          <label className="block space-y-1 text-sm font-semibold">
            Descripción opcional

            <textarea
              className={input}
              value={routineDescription}
              onChange={(e) =>
                setRoutineDescription(e.target.value)
              }
              rows={2}
              maxLength={500}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={primary}
              disabled={busy || !routineName.trim()}
            >
              <Check size={16} />
              Guardar
            </button>

            <button
              type="button"
              className={secondary}
              onClick={() => setRoutineForm(false)}
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* PASO 1: RUTINAS */}

      <div className={`${panel} space-y-3`}>
        <h2 className="text-lg font-bold">
          1. Elige una rutina
        </h2>

        {routines.length === 0 ? (
          <p className="text-sm text-[#766A74]">
            Aún no tienes rutinas. Crea una para comenzar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {routines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  setRoutineId(routine.id)
                  setDayForm(false)
                  setExerciseForm(false)
                }}
                className={
                  routine.id === routineId
                    ? primary
                    : secondary
                }
                aria-pressed={routine.id === routineId}
              >
                {routine.name}
                {routine.active ? ' ★' : ''}
              </button>
            ))}
          </div>
        )}

        {selectedRoutine && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#F3D6E2] pt-3">
            <span className="mr-auto text-sm text-[#766A74]">
              Versión {selectedRoutine.version} ·{' '}
              {selectedRoutine.active ? 'Activa' : 'Inactiva'}
            </span>

            <button
              className={secondary}
              type="button"
              onClick={() => startRoutineEdit(selectedRoutine)}
            >
              <Pencil size={15} />
              Editar
            </button>

            <button
              className={secondary}
              type="button"
              onClick={() =>
                setConfirmDelete(`routine:${selectedRoutine.id}`)
              }
            >
              <Trash2 size={15} />
              Eliminar
            </button>

            {confirmDelete === `routine:${selectedRoutine.id}` && (
              <div className="w-full space-y-2 rounded-xl bg-red-50 p-3 text-sm">
                <p>
                  ¿Ocultar esta rutina? Podrás restaurarla.
                </p>

                <button
                  type="button"
                  className={secondary}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await deleteRoutine(selectedRoutine.id)
                      await loadRoutines()
                    }, 'Rutina eliminada sin borrar el historial.')
                  }
                >
                  Confirmar
                </button>

                <button
                  type="button"
                  className={secondary}
                  onClick={() => setConfirmDelete('')}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASO 2: DÍAS */}

      {selectedRoutine && (
        <div className={`${panel} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">
              2. Días de la rutina
            </h2>

            <button
              type="button"
              className={secondary}
              onClick={startDayCreate}
            >
              <Plus size={16} />
              Añadir día
            </button>
          </div>

          {dayForm && (
            <form
              className="space-y-3 rounded-xl bg-[#FFF9FC] p-3"
              onSubmit={(event) => {
                event.preventDefault()

                void perform(async () => {
                  if (editDayId) {
                    await updateRoutineDay(editDayId, {
                      name: dayName,
                    })
                  } else {
                    const day = await createRoutineDay({
                      routineId,
                      name: dayName,
                    })

                    setDayId(day.id)
                  }

                  await loadDays(routineId)
                  setDayForm(false)
                }, editDayId ? 'Día actualizado.' : 'Día añadido.')
              }}
            >
              <label className="block space-y-1 text-sm font-semibold">
                Nombre del día

                <input
                  className={input}
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                  placeholder="Ej.: Lunes · Glúteos y cuádriceps"
                  required
                  maxLength={90}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={primary}
                  disabled={busy || !dayName.trim()}
                >
                  Guardar día
                </button>

                <button
                  type="button"
                  className={secondary}
                  onClick={() => setDayForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {days.length === 0 ? (
            <p className="text-sm text-[#766A74]">
              Añade un día para comenzar a organizar ejercicios.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={day.id === dayId}
                  onClick={() => {
                    setDayId(day.id)
                    setExerciseForm(false)
                  }}
                  className={
                    day.id === dayId
                      ? primary
                      : secondary
                  }
                >
                  {day.name}
                </button>
              ))}
            </div>
          )}

          {selectedDay && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#F3D6E2] pt-3">
              <span className="mr-auto text-sm font-medium">
                {selectedDay.name}
              </span>

              <button
                type="button"
                className={secondary}
                onClick={() => startDayEdit(selectedDay)}
              >
                <Pencil size={15} />
                Editar
              </button>

              <button
                type="button"
                className={secondary}
                onClick={() =>
                  setConfirmDelete(`day:${selectedDay.id}`)
                }
              >
                <Trash2 size={15} />
                Eliminar
              </button>

              {confirmDelete === `day:${selectedDay.id}` && (
                <div className="w-full space-y-2 rounded-xl bg-red-50 p-3 text-sm">
                  <p>
                    Se ocultará el día y sus ejercicios de la rutina.
                    No se borrará el historial.
                  </p>

                  <button
                    type="button"
                    className={secondary}
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await deleteRoutineDay(selectedDay.id)
                        await loadDays(routineId)
                      }, 'Día eliminado.')
                    }
                  >
                    Confirmar
                  </button>

                  <button
                    type="button"
                    className={secondary}
                    onClick={() => setConfirmDelete('')}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PASO 3: EJERCICIOS */}

      {selectedDay && selectedRoutine && (
        <div className={`${panel} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">
                3. Ejercicios
              </h2>

              <p className="text-xs text-[#766A74]">
                {selectedDay.name}
              </p>
            </div>

            <button
              type="button"
              className={primary}
              onClick={startExerciseCreate}
              disabled={library.length === 0}
            >
              <Plus size={16} />
              Añadir ejercicio
            </button>
          </div>

          {library.length === 0 && (
            <p className="rounded-xl bg-[#FFF9FC] p-3 text-sm">
              Primero crea ejercicios en la pestaña Más.
            </p>
          )}

          {exerciseForm && (
            <form
              className="space-y-4 rounded-xl border border-[#F3D6E2] bg-[#FFF9FC] p-3"
              onSubmit={(event) => {
                event.preventDefault()

                void perform(async () => {
                  if (!exerciseId) {
                    throw new Error('Selecciona un ejercicio.')
                  }

                  if (minReps > maxReps) {
                    throw new Error(
                      'Las repeticiones mínimas no pueden superar las máximas.',
                    )
                  }

                  const values = {
                    exerciseId,
                    sets,
                    minReps,
                    maxReps,
                    targetRIR: rir,
                    restSeconds: rest,
                  }

                  if (editItemId) {
                    await updateRoutineExercise(
                      editItemId,
                      values,
                    )
                  } else {
                    await createRoutineExercise({
                      ...values,
                      routineDayId: dayId,
                    })
                  }

                  await loadItems(dayId)
                  setExerciseForm(false)
                }, editItemId
                  ? 'Ejercicio actualizado.'
                  : 'Ejercicio añadido al día.')
              }}
            >
              <h3 className="font-bold">
                {editItemId
                  ? 'Editar prescripción'
                  : 'Añadir ejercicio al día'}
              </h3>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Ejercicio de mi biblioteca</p>
                <ExercisePicker
                  library={library}
                  value={exerciseId}
                  onChange={setExerciseId}
                  disabled={Boolean(editItemId)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Counter
                  label="Series"
                  value={sets}
                  min={1}
                  max={15}
                  onChange={setSets}
                />

                <Counter
                  label="Reps mín."
                  value={minReps}
                  min={1}
                  max={100}
                  onChange={setMinReps}
                />

                <Counter
                  label="Reps máx."
                  value={maxReps}
                  min={1}
                  max={100}
                  onChange={setMaxReps}
                />

                <Counter
                  label="RIR objetivo"
                  value={rir}
                  min={0}
                  max={10}
                  onChange={setRir}
                />

                <Counter
                  label="Descanso"
                  value={rest}
                  min={0}
                  max={900}
                  step={30}
                  format={timeLabel}
                  onChange={setRest}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={primary}
                  disabled={busy}
                >
                  <Check size={16} />
                  Guardar ejercicio
                </button>

                <button
                  type="button"
                  className={secondary}
                  onClick={() => setExerciseForm(false)}
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {items.filter(
            (item) => item.routineDayId === dayId,
          ).length === 0 ? (
            <p className="text-sm text-[#766A74]">
              Todavía no has añadido ejercicios a este día.
            </p>
          ) : (
            <div className="space-y-3">
              {items
                .filter((item) => item.routineDayId === dayId)
                .map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#F3D6E2] bg-white p-3"
                  >
                    <p className="text-xs font-bold text-[#E30B5D]">
                      EJERCICIO {index + 1}
                    </p>

                    <h3 className="font-bold">
                      {exerciseName(item.exerciseId)}
                    </h3>

                    <p className="mt-1 text-sm text-[#766A74]">
                      {item.sets} series ·{' '}
                      {item.minReps}–{item.maxReps} reps ·{' '}
                      RIR {item.targetRIR ?? '—'} ·{' '}
                      {timeLabel(item.restSeconds)} descanso
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => startExerciseEdit(item)}
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        className={secondary}
                        onClick={() =>
                          setConfirmDelete(`item:${item.id}`)
                        }
                      >
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </div>

                    {confirmDelete === `item:${item.id}` && (
                      <div className="mt-3 space-y-2 rounded-xl bg-red-50 p-3 text-sm">
                        <p>
                          ¿Quitar este ejercicio del día?
                          El historial anterior se conserva.
                        </p>

                        <button
                          type="button"
                          className={secondary}
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await deleteRoutineExercise(item.id)
                              await loadItems(dayId)
                            }, 'Ejercicio quitado de la rutina.')
                          }
                        >
                          Confirmar
                        </button>

                        <button
                          type="button"
                          className={secondary}
                          onClick={() => setConfirmDelete('')}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </article>
                ))}
            </div>
          )}

          <p className="text-xs text-[#766A74]">
            La programación queda guardada.
            Iniciar un entrenamiento real desde esta rutina
            será el siguiente módulo.
          </p>
        </div>
      )}

      {/* PAPELERA */}

      <div className={panel}>
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-bold text-[#A3275A]"
          onClick={() => setShowTrash((v) => !v)}
        >
          <span className="inline-flex items-center gap-2">
            <Trash2 size={17} />
            Elementos eliminados
          </span>

          <span>
            {showTrash ? 'Ocultar' : 'Mostrar'}
          </span>
        </button>

        {showTrash && (
          <div className="mt-3 space-y-3 text-sm">
            <p className="font-semibold">
              Rutinas ({trashRoutines.length})
            </p>

            {trashRoutines.map((routine) => (
              <div
                key={routine.id}
                className="flex items-center justify-between gap-2"
              >
                <span>{routine.name}</span>

                <button
                  type="button"
                  className={secondary}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await restoreRoutine(routine.id)
                      await loadRoutines()
                    }, 'Rutina restaurada.')
                  }
                >
                  <RotateCcw size={15} />
                  Restaurar
                </button>
              </div>
            ))}

            {selectedRoutine && (
              <>
                <p className="font-semibold">
                  Días de esta rutina ({trashDays.length})
                </p>

                {trashDays.map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{day.name}</span>

                    <button
                      type="button"
                      className={secondary}
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await restoreRoutineDay(day.id)
                          await loadDays(routineId)
                        }, 'Día restaurado.')
                      }
                    >
                      <RotateCcw size={15} />
                      Restaurar
                    </button>
                  </div>
                ))}
              </>
            )}

            {selectedDay && (
              <>
                <p className="font-semibold">
                  Ejercicios de este día ({trashItems.length})
                </p>

                {trashItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {exerciseName(item.exerciseId)}
                    </span>

                    <button
                      type="button"
                      className={secondary}
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await restoreRoutineExercise(item.id)
                          await loadItems(dayId)
                        }, 'Ejercicio restaurado.')
                      }
                    >
                      <RotateCcw size={15} />
                      Restaurar
                    </button>
                  </div>
                ))}
              </>
            )}

            {trashRoutines.length +
              trashDays.length +
              trashItems.length === 0 && (
              <p className="text-[#766A74]">
                No hay elementos eliminados en la selección actual.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
