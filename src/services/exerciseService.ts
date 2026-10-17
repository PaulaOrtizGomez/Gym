import { db } from '../db/database'

import type {
  Exercise,
  ExerciseCategory,
} from '../types/domain'

type CreateExerciseInput = {
  name: string
  category: ExerciseCategory
  movementPattern?: string
  equipment?: string
  instructions?: string
  notes?: string
  favorite?: boolean
}

type UpdateExerciseInput = {
  name?: string
  category?: ExerciseCategory
  movementPattern?: string
  equipment?: string
  instructions?: string
  notes?: string
  favorite?: boolean
}

function cleanOptionalText(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const cleaned = value.trim()

  return cleaned === ''
    ? undefined
    : cleaned
}

export async function createExercise(
  input: CreateExerciseInput,
): Promise<Exercise> {
  const name = input.name.trim()

  if (!name) {
    throw new Error(
      'El nombre del ejercicio es obligatorio.',
    )
  }

  const now = new Date().toISOString()

  const exercise: Exercise = {
    id: crypto.randomUUID(),

    name,

    category:
      input.category,

    movementPattern:
      cleanOptionalText(
        input.movementPattern,
      ),

    equipment:
      cleanOptionalText(
        input.equipment,
      ),

    instructions:
      cleanOptionalText(
        input.instructions,
      ),

    notes:
      cleanOptionalText(
        input.notes,
      ),

    favorite:
      input.favorite ?? false,

    createdAt:
      now,

    updatedAt:
      now,
  }

  await db.exercises.add(
    exercise,
  )

  return exercise
}

export async function getExercises(): Promise<
  Exercise[]
> {
  const exercises =
    await db.exercises
      .filter(
        (exercise) =>
          !exercise.deletedAt,
      )
      .toArray()

  return exercises.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'es',
      ),
  )
}

export async function getDeletedExercises(): Promise<
  Exercise[]
> {
  const exercises =
    await db.exercises
      .filter(
        (exercise) =>
          Boolean(
            exercise.deletedAt,
          ),
      )
      .toArray()

  return exercises.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'es',
      ),
  )
}

export async function getExerciseById(
  id: string,
): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

export async function updateExercise(
  id: string,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  const existingExercise =
    await db.exercises.get(id)

  if (!existingExercise) {
    throw new Error(
      'No se encontró el ejercicio.',
    )
  }

  if (existingExercise.deletedAt) {
    throw new Error(
      'No puedes editar un ejercicio eliminado.',
    )
  }

  const updatedName =
    input.name !== undefined
      ? input.name.trim()
      : existingExercise.name

  if (!updatedName) {
    throw new Error(
      'El nombre del ejercicio es obligatorio.',
    )
  }

  const now =
    new Date().toISOString()

  const updatedExercise: Exercise = {
    ...existingExercise,

    name:
      updatedName,

    category:
      input.category ??
      existingExercise.category,

    movementPattern:
      input.movementPattern !== undefined
        ? cleanOptionalText(
            input.movementPattern,
          )
        : existingExercise.movementPattern,

    equipment:
      input.equipment !== undefined
        ? cleanOptionalText(
            input.equipment,
          )
        : existingExercise.equipment,

    instructions:
      input.instructions !== undefined
        ? cleanOptionalText(
            input.instructions,
          )
        : existingExercise.instructions,

    notes:
      input.notes !== undefined
        ? cleanOptionalText(
            input.notes,
          )
        : existingExercise.notes,

    favorite:
      input.favorite ??
      existingExercise.favorite,

    updatedAt:
      now,
  }

  await db.exercises.put(
    updatedExercise,
  )

  return updatedExercise
}

export async function deleteExercise(
  id: string,
): Promise<void> {
  const existingExercise =
    await db.exercises.get(id)

  if (!existingExercise) {
    throw new Error(
      'No se encontró el ejercicio.',
    )
  }

  if (existingExercise.deletedAt) {
    return
  }

  const now =
    new Date().toISOString()

  await db.exercises.update(
    id,
    {
      deletedAt: now,
      updatedAt: now,
    },
  )
}

export async function restoreExercise(
  id: string,
): Promise<Exercise> {
  const existingExercise =
    await db.exercises.get(id)

  if (!existingExercise) {
    throw new Error(
      'No se encontró el ejercicio.',
    )
  }

  if (!existingExercise.deletedAt) {
    return existingExercise
  }

  const now =
    new Date().toISOString()

  const restoredExercise: Exercise = {
    ...existingExercise,

    deletedAt:
      undefined,

    updatedAt:
      now,
  }

  await db.exercises.put(
    restoredExercise,
  )

  return restoredExercise
}

export async function toggleExerciseFavorite(
  id: string,
): Promise<Exercise> {
  const existingExercise =
    await db.exercises.get(id)

  if (!existingExercise) {
    throw new Error(
      'No se encontró el ejercicio.',
    )
  }

  if (existingExercise.deletedAt) {
    throw new Error(
      'No puedes modificar un ejercicio eliminado.',
    )
  }

  const updatedExercise: Exercise = {
    ...existingExercise,

    favorite:
      !existingExercise.favorite,

    updatedAt:
      new Date().toISOString(),
  }

  await db.exercises.put(
    updatedExercise,
  )

  return updatedExercise
}