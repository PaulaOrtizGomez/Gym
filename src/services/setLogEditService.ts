import { db } from '../db/database'
import type { SetLog, WorkoutExercise } from '../types/domain'

type ChangeSetValues = {
  weight: number
  reps: number
  rir: number
}

function validateValues(input: ChangeSetValues) {
  if (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > 1000) {
    throw new Error('Introduce un peso válido entre 0 y 1000 kg.')
  }

  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 100) {
    throw new Error('Las repeticiones deben ser un entero entre 1 y 100.')
  }

  if (!Number.isInteger(input.rir) || input.rir < 0 || input.rir > 10) {
    throw new Error('El RIR debe ser un entero entre 0 y 10.')
  }
}

// Verifica dentro de la misma transacción que la serie sigue perteneciendo
// a un entrenamiento ACTIVO. Ningún historial cerrado se modifica.
async function requireEditableSet(setId: string): Promise<{
  log: SetLog
  exercise: WorkoutExercise
}> {
  const log = await db.setLogs.get(setId)
  if (!log || log.deletedAt) {
    throw new Error('Esta serie ya no está disponible. Actualiza la pantalla.')
  }

  const exercise = await db.workoutExercises.get(log.workoutExerciseId)
  if (!exercise || exercise.deletedAt) {
    throw new Error('El ejercicio de esta serie ya no está disponible.')
  }

  const workout = await db.workouts.get(exercise.workoutId)
  if (!workout || workout.deletedAt || workout.status !== 'inProgress') {
    throw new Error('Solo puedes corregir series de un entrenamiento en curso.')
  }

  return { log, exercise }
}

// Modifica los valores, sin cambiar el ID, el número de serie ni la fecha
// original de realización. Así no se rompen historial ni respaldos JSON.
export async function editSetLog(
  setId: string,
  values: ChangeSetValues,
): Promise<void> {
  validateValues(values)

  await db.transaction(
    'rw',
    db.setLogs,
    db.workoutExercises,
    db.workouts,
    async () => {
      await requireEditableSet(setId)
      await db.setLogs.update(setId, {
        weight: values.weight,
        reps: values.reps,
        rir: values.rir,
        updatedAt: new Date().toISOString(),
      })
    },
  )
}

// Borrado lógico: el registro permanece dentro de IndexedDB y los respaldos,
// pero deja de contarse como serie realizada. Se libera su número para grabarlo otra vez.
export async function deleteSetLog(setId: string): Promise<void> {
  await db.transaction(
    'rw',
    db.setLogs,
    db.workoutExercises,
    db.workouts,
    async () => {
      const { log, exercise } = await requireEditableSet(setId)
      const now = new Date().toISOString()

      await db.setLogs.update(log.id, {
        deletedAt: now,
        updatedAt: now,
      })

      const activeLogs = await db.setLogs
        .where('workoutExerciseId')
        .equals(exercise.id)
        .filter((item) => !item.deletedAt)
        .toArray()

      await db.workoutExercises.update(exercise.id, {
        status: activeLogs.length === 0
          ? 'pending'
          : activeLogs.length >= exercise.plannedSetsSnapshot
            ? 'completed'
            : 'inProgress',
        updatedAt: now,
      })
    },
  )
}
