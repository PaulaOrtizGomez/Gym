import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import Card from '../ui/Card'

import {
  createExercise,
  deleteExercise,
  getDeletedExercises,
  getExercises,
  restoreExercise,
  toggleExerciseFavorite,
  updateExercise,
} from '../../services/exerciseService'

import type {
  Exercise,
  ExerciseCategory,
} from '../../types/domain'

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'Glúteos',
  'Cuádriceps',
  'Femoral',
  'Pantorrilla',
  'Espalda',
  'Pecho',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
  'Otro',
]

type ExerciseFormState = {
  name: string
  category: ExerciseCategory
  movementPattern: string
  equipment: string
  instructions: string
  notes: string
  favorite: boolean
}

const EMPTY_FORM: ExerciseFormState = {
  name: '',
  category: 'Otro',
  movementPattern: '',
  equipment: '',
  instructions: '',
  notes: '',
  favorite: false,
}

async function fetchExerciseLists() {
  const [
    activeExercises,
    removedExercises,
  ] = await Promise.all([
    getExercises(),
    getDeletedExercises(),
  ])

  return {
    activeExercises,
    removedExercises,
  }
}

function ExerciseManager() {
  const [
    exercises,
    setExercises,
  ] = useState<Exercise[]>([])

  const [
    deletedExercises,
    setDeletedExercises,
  ] = useState<Exercise[]>([])

  const [
    form,
    setForm,
  ] = useState<ExerciseFormState>(
    EMPTY_FORM,
  )

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  )

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    async function loadInitialExercises() {
      try {
        const {
          activeExercises,
          removedExercises,
        } =
          await fetchExerciseLists()

        if (cancelled) {
          return
        }

        setExercises(
          activeExercises,
        )

        setDeletedExercises(
          removedExercises,
        )
      } catch (error) {
        console.error(
          'No se pudieron cargar los ejercicios:',
          error,
        )

        if (!cancelled) {
          setError(
            'No pudimos cargar la biblioteca de ejercicios.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialExercises()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshExercises() {
    const {
      activeExercises,
      removedExercises,
    } =
      await fetchExerciseLists()

    setExercises(
      activeExercises,
    )

    setDeletedExercises(
      removedExercises,
    )
  }

  function resetForm() {
    setForm(EMPTY_FORM)

    setEditingId(null)

    setError(null)
  }

  function handleChange<
    K extends keyof ExerciseFormState,
  >(
    field: K,
    value: ExerciseFormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    )
  }

  function handleEdit(
    exercise: Exercise,
  ) {
    setEditingId(
      exercise.id,
    )

    setForm({
      name:
        exercise.name,

      category:
        exercise.category,

      movementPattern:
        exercise.movementPattern ??
        '',

      equipment:
        exercise.equipment ??
        '',

      instructions:
        exercise.instructions ??
        '',

      notes:
        exercise.notes ??
        '',

      favorite:
        exercise.favorite,
    })

    setError(null)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError(
        'El nombre del ejercicio es obligatorio.',
      )

      return
    }

    setIsSaving(true)

    setError(null)

    try {
      if (editingId) {
        await updateExercise(
          editingId,
          {
            name:
              form.name,

            category:
              form.category,

            movementPattern:
              form.movementPattern,

            equipment:
              form.equipment,

            instructions:
              form.instructions,

            notes:
              form.notes,

            favorite:
              form.favorite,
          },
        )
      } else {
        await createExercise({
          name:
            form.name,

          category:
            form.category,

          movementPattern:
            form.movementPattern,

          equipment:
            form.equipment,

          instructions:
            form.instructions,

          notes:
            form.notes,

          favorite:
            form.favorite,
        })
      }

      resetForm()

      await refreshExercises()
    } catch (error) {
      console.error(
        'No se pudo guardar el ejercicio:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'No pudimos guardar el ejercicio.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(
    exercise: Exercise,
  ) {
    const confirmed =
      window.confirm(
        `¿Eliminar "${exercise.name}" de la biblioteca?\n\nEl historial antiguo no se perderá.`,
      )

    if (!confirmed) {
      return
    }

    setError(null)

    try {
      await deleteExercise(
        exercise.id,
      )

      if (
        editingId ===
        exercise.id
      ) {
        resetForm()
      }

      await refreshExercises()
    } catch (error) {
      console.error(
        'No se pudo eliminar el ejercicio:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'No pudimos eliminar el ejercicio.',
      )
    }
  }

  async function handleRestore(
    exercise: Exercise,
  ) {
    setError(null)

    try {
      await restoreExercise(
        exercise.id,
      )

      await refreshExercises()
    } catch (error) {
      console.error(
        'No se pudo restaurar el ejercicio:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'No pudimos restaurar el ejercicio.',
      )
    }
  }

  async function handleToggleFavorite(
    exercise: Exercise,
  ) {
    setError(null)

    try {
      await toggleExerciseFavorite(
        exercise.id,
      )

      await refreshExercises()
    } catch (error) {
      console.error(
        'No se pudo modificar el favorito:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'No pudimos modificar el favorito.',
      )
    }
  }

  return (
    <Card>
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          BIBLIOTECA
        </p>

        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          Ejercicios
        </h2>

        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Crea, edita y administra tus ejercicios.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="
          mt-6
          rounded-[var(--radius-lg)]
          border
          border-[var(--color-border)]
          bg-[var(--color-background)]
          p-4
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            {editingId
              ? 'Editar ejercicio'
              : 'Nuevo ejercicio'}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="
                rounded-xl
                px-3
                py-2
                text-sm
                font-medium
                text-[var(--color-primary)]

                hover:bg-[var(--color-primary-soft)]
              "
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div
          className="
            mt-4
            grid
            grid-cols-1
            gap-4

            sm:grid-cols-2
          "
        >
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Nombre *
            </span>

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                handleChange(
                  'name',
                  event.target.value,
                )
              }
              placeholder="Ej: Prensa"
              className="
                mt-2
                min-h-12
                w-full
                rounded-xl
                border
                border-[var(--color-border)]
                bg-white
                px-4
                text-base
                text-[var(--color-text-primary)]
              "
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Categoría *
            </span>

            <select
              value={
                form.category
              }
              onChange={(event) =>
                handleChange(
                  'category',
                  event.target
                    .value as ExerciseCategory,
                )
              }
              className="
                mt-2
                min-h-12
                w-full
                rounded-xl
                border
                border-[var(--color-border)]
                bg-white
                px-4
                text-base
                text-[var(--color-text-primary)]
              "
            >
              {EXERCISE_CATEGORIES.map(
                (category) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {
                      category
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Equipamiento
            </span>

            <input
              type="text"
              value={
                form.equipment
              }
              onChange={(event) =>
                handleChange(
                  'equipment',
                  event.target
                    .value,
                )
              }
              placeholder="Ej: Máquina Smith"
              className="
                mt-2
                min-h-12
                w-full
                rounded-xl
                border
                border-[var(--color-border)]
                bg-white
                px-4
                text-base
                text-[var(--color-text-primary)]
              "
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Patrón de movimiento
            </span>

            <input
              type="text"
              value={
                form.movementPattern
              }
              onChange={(event) =>
                handleChange(
                  'movementPattern',
                  event.target
                    .value,
                )
              }
              placeholder="Ej: Extensión de cadera"
              className="
                mt-2
                min-h-12
                w-full
                rounded-xl
                border
                border-[var(--color-border)]
                bg-white
                px-4
                text-base
                text-[var(--color-text-primary)]
              "
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Instrucciones
          </span>

          <textarea
            value={
              form.instructions
            }
            onChange={(event) =>
              handleChange(
                'instructions',
                event.target
                  .value,
              )
            }
            rows={3}
            placeholder="Indicaciones técnicas del ejercicio..."
            className="
              mt-2
              w-full
              resize-y
              rounded-xl
              border
              border-[var(--color-border)]
              bg-white
              px-4
              py-3
              text-base
              text-[var(--color-text-primary)]
            "
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Notas
          </span>

          <textarea
            value={
              form.notes
            }
            onChange={(event) =>
              handleChange(
                'notes',
                event.target
                  .value,
              )
            }
            rows={2}
            placeholder="Ej: asiento 3, pies altos..."
            className="
              mt-2
              w-full
              resize-y
              rounded-xl
              border
              border-[var(--color-border)]
              bg-white
              px-4
              py-3
              text-base
              text-[var(--color-text-primary)]
            "
          />
        </label>

        <label
          className="
            mt-4
            flex
            min-h-12
            items-center
            gap-3
            rounded-xl
            border
            border-[var(--color-border)]
            bg-white
            px-4
          "
        >
          <input
            type="checkbox"
            checked={
              form.favorite
            }
            onChange={(event) =>
              handleChange(
                'favorite',
                event.target
                  .checked,
              )
            }
            className="h-5 w-5"
          />

          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Marcar como favorito
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="
              mt-4
              rounded-xl
              bg-red-50
              px-4
              py-3
              text-sm
              text-[var(--color-danger)]
            "
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            isSaving
          }
          className="
            mt-5
            min-h-12
            w-full
            rounded-xl
            bg-[var(--color-primary-button)]
            px-5
            py-3
            text-base
            font-semibold
            text-[var(--color-text-primary)]
            shadow-sm
            transition

            hover:bg-[var(--color-primary-button-hover)]

            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isSaving
            ? 'Guardando...'
            : editingId
              ? 'Guardar cambios'
              : 'Crear ejercicio'}
        </button>
      </form>

      <div className="mt-7">
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Ejercicios activos
          </h3>

          <span className="text-sm text-[var(--color-text-secondary)]">
            {exercises.length}
          </span>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            Cargando ejercicios...
          </p>
        ) : exercises.length ===
          0 ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            Todavía no tienes ejercicios.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {exercises.map(
              (exercise) => (
                <article
                  key={
                    exercise.id
                  }
                  className="
                    rounded-[var(--radius-lg)]
                    border
                    border-[var(--color-border)]
                    bg-white
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
                    "
                  >
                    <div>
                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >
                        <h4 className="font-bold text-[var(--color-text-primary)]">
                          {
                            exercise.name
                          }
                        </h4>

                        {exercise.favorite && (
                          <span
                            className="
                              rounded-full
                              bg-[var(--color-primary-soft)]
                              px-2
                              py-1
                              text-xs
                              font-semibold
                              text-[var(--color-primary)]
                            "
                          >
                            Favorito
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {
                          exercise.category
                        }

                        {exercise.equipment &&
                          ` · ${exercise.equipment}`}
                      </p>

                      {exercise.movementPattern && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {
                            exercise.movementPattern
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-2
                      gap-2

                      sm:grid-cols-4
                    "
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          exercise,
                        )
                      }
                      className="
                        min-h-11
                        rounded-xl
                        border
                        border-[var(--color-border)]
                        px-3
                        text-sm
                        font-semibold
                        text-[var(--color-primary)]

                        hover:bg-[var(--color-primary-soft)]
                      "
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleFavorite(
                          exercise,
                        )
                      }
                      className="
                        min-h-11
                        rounded-xl
                        border
                        border-[var(--color-border)]
                        px-3
                        text-sm
                        font-semibold
                        text-[var(--color-text-secondary)]

                        hover:bg-[var(--color-surface-soft)]
                      "
                    >
                      {exercise.favorite
                        ? 'Quitar favorito'
                        : 'Favorito'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          exercise,
                        )
                      }
                      className="
                        min-h-11
                        rounded-xl
                        border
                        border-[var(--color-border)]
                        px-3
                        text-sm
                        font-semibold
                        text-[var(--color-danger)]

                        hover:bg-red-50

                        sm:col-span-2
                      "
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>

      {deletedExercises.length >
        0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Eliminados
          </h3>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Puedes restaurarlos sin perder su historial.
          </p>

          <div className="mt-4 space-y-3">
            {deletedExercises.map(
              (exercise) => (
                <article
                  key={
                    exercise.id
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-[var(--radius-lg)]
                    border
                    border-[var(--color-border)]
                    bg-[var(--color-surface-soft)]
                    p-4
                  "
                >
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {
                        exercise.name
                      }
                    </p>

                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {
                        exercise.category
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleRestore(
                        exercise,
                      )
                    }
                    className="
                      min-h-11
                      rounded-xl
                      bg-[var(--color-primary-soft)]
                      px-4
                      text-sm
                      font-semibold
                      text-[var(--color-primary)]
                    "
                  >
                    Restaurar
                  </button>
                </article>
              ),
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default ExerciseManager