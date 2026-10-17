import { db } from '../db/database'

import type {
  Routine,
  RoutineDay,
  RoutineExercise,
} from '../types/domain'

/*
 * =====================================
 * INPUTS
 * =====================================
 */

export type CreateRoutineInput = {
  name: string
  description?: string
  active?: boolean
}

export type UpdateRoutineInput = {
  name?: string
  description?: string
  active?: boolean
}

export type CreateRoutineDayInput = {
  routineId: string

  name: string
  dayOfWeek?: number

  order?: number
}

export type UpdateRoutineDayInput = {
  name?: string
  dayOfWeek?: number
  order?: number
}

export type CreateRoutineExerciseInput = {
  routineDayId: string

  exerciseId: string
  variantId?: string

  order?: number

  sets: number

  minReps: number
  maxReps: number

  targetRIR?: number

  restSeconds: number

  notes?: string
}

export type UpdateRoutineExerciseInput = {
  exerciseId?: string
  variantId?: string

  order?: number

  sets?: number

  minReps?: number
  maxReps?: number

  targetRIR?: number

  restSeconds?: number

  notes?: string
}

/*
 * =====================================
 * HELPERS
 * =====================================
 */

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

function validateName(
  value: string,
  label: string,
) {
  if (!value.trim()) {
    throw new Error(
      `${label} es obligatorio.`,
    )
  }
}

function validateDayOfWeek(
  value: number | undefined,
) {
  if (value === undefined) {
    return
  }

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 6
  ) {
    throw new Error(
      'El día de la semana debe estar entre 0 y 6.',
    )
  }
}

function validateRoutineExerciseValues(
  values: {
    sets: number
    minReps: number
    maxReps: number
    targetRIR?: number
    restSeconds: number
  },
) {
  if (
    !Number.isInteger(values.sets) ||
    values.sets <= 0
  ) {
    throw new Error(
      'Las series deben ser un número entero mayor que 0.',
    )
  }

  if (
    !Number.isInteger(
      values.minReps,
    ) ||
    values.minReps <= 0
  ) {
    throw new Error(
      'Las repeticiones mínimas deben ser mayores que 0.',
    )
  }

  if (
    !Number.isInteger(
      values.maxReps,
    ) ||
    values.maxReps <= 0
  ) {
    throw new Error(
      'Las repeticiones máximas deben ser mayores que 0.',
    )
  }

  if (
    values.minReps >
    values.maxReps
  ) {
    throw new Error(
      'Las repeticiones mínimas no pueden superar las máximas.',
    )
  }

  if (
    values.targetRIR !==
      undefined &&
    (
      !Number.isInteger(
        values.targetRIR,
      ) ||
      values.targetRIR < 0 ||
      values.targetRIR > 10
    )
  ) {
    throw new Error(
      'El RIR debe estar entre 0 y 10.',
    )
  }

  if (
    !Number.isInteger(
      values.restSeconds,
    ) ||
    values.restSeconds < 0
  ) {
    throw new Error(
      'El descanso debe ser de 0 segundos o más.',
    )
  }
}

async function touchRoutine(
  routineId: string,
) {
  const routine =
    await db.routines.get(
      routineId,
    )

  if (!routine) {
    return
  }

  await db.routines.update(
    routineId,
    {
      version:
        routine.version + 1,

      updatedAt:
        new Date().toISOString(),
    },
  )
}

/*
 * =====================================
 * ROUTINE
 * =====================================
 */

export async function createRoutine(
  input: CreateRoutineInput,
): Promise<Routine> {
  validateName(
    input.name,
    'El nombre de la rutina',
  )

  const now =
    new Date().toISOString()

  const routine: Routine = {
    id: crypto.randomUUID(),

    name:
      input.name.trim(),

    description:
      cleanOptionalText(
        input.description,
      ),

    active:
      input.active ?? false,

    version: 1,

    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',

    db.routines,

    async () => {
      /*
       * Si la nueva rutina se crea como
       * activa, desactivamos las demás.
       */
      if (routine.active) {
        const activeRoutines =
          await db.routines
            .where('active')
            .equals(1)
            .toArray()

        for (
          const activeRoutine of
          activeRoutines
        ) {
          if (
            !activeRoutine.deletedAt
          ) {
            await db.routines.update(
              activeRoutine.id,
              {
                active: false,
                updatedAt: now,
              },
            )
          }
        }
      }

      await db.routines.add(
        routine,
      )
    },
  )

  return routine
}

export async function getRoutines(): Promise<
  Routine[]
> {
  const routines =
    await db.routines
      .filter(
        (routine) =>
          !routine.deletedAt,
      )
      .toArray()

  return routines.sort(
    (a, b) => {
      if (
        a.active !== b.active
      ) {
        return a.active
          ? -1
          : 1
      }

      return a.name.localeCompare(
        b.name,
        'es',
      )
    },
  )
}

export async function getDeletedRoutines(): Promise<
  Routine[]
> {
  const routines =
    await db.routines
      .filter(
        (routine) =>
          Boolean(
            routine.deletedAt,
          ),
      )
      .toArray()

  return routines.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'es',
      ),
  )
}

export async function getRoutineById(
  id: string,
): Promise<Routine | undefined> {
  return db.routines.get(id)
}

export async function updateRoutine(
  id: string,
  input: UpdateRoutineInput,
): Promise<Routine> {
  const existingRoutine =
    await db.routines.get(id)

  if (!existingRoutine) {
    throw new Error(
      'No se encontró la rutina.',
    )
  }

  if (
    existingRoutine.deletedAt
  ) {
    throw new Error(
      'No puedes editar una rutina eliminada.',
    )
  }

  const name =
    input.name !== undefined
      ? input.name.trim()
      : existingRoutine.name

  validateName(
    name,
    'El nombre de la rutina',
  )

  const now =
    new Date().toISOString()

  const active =
    input.active ??
    existingRoutine.active

  const updatedRoutine: Routine = {
    ...existingRoutine,

    name,

    description:
      input.description !==
      undefined
        ? cleanOptionalText(
            input.description,
          )
        : existingRoutine.description,

    active,

    version:
      existingRoutine.version + 1,

    updatedAt: now,
  }

  await db.transaction(
    'rw',

    db.routines,

    async () => {
      if (active) {
        const activeRoutines =
          await db.routines
            .where('active')
            .equals(1)
            .toArray()

        for (
          const routine of
          activeRoutines
        ) {
          if (
            routine.id !== id &&
            !routine.deletedAt
          ) {
            await db.routines.update(
              routine.id,
              {
                active: false,
                updatedAt: now,
              },
            )
          }
        }
      }

      await db.routines.put(
        updatedRoutine,
      )
    },
  )

  return updatedRoutine
}

export async function setActiveRoutine(
  id: string,
): Promise<Routine> {
  return updateRoutine(
    id,
    {
      active: true,
    },
  )
}

export async function deleteRoutine(
  id: string,
): Promise<void> {
  const routine =
    await db.routines.get(id)

  if (!routine) {
    throw new Error(
      'No se encontró la rutina.',
    )
  }

  if (routine.deletedAt) {
    return
  }

  const now =
    new Date().toISOString()

  await db.routines.update(
    id,
    {
      active: false,

      deletedAt: now,
      updatedAt: now,
    },
  )
}

export async function restoreRoutine(
  id: string,
): Promise<Routine> {
  const routine =
    await db.routines.get(id)

  if (!routine) {
    throw new Error(
      'No se encontró la rutina.',
    )
  }

  if (!routine.deletedAt) {
    return routine
  }

  const restored: Routine = {
    ...routine,

    active: false,

    deletedAt:
      undefined,

    updatedAt:
      new Date().toISOString(),
  }

  await db.routines.put(
    restored,
  )

  return restored
}

/*
 * =====================================
 * ROUTINE DAY
 * =====================================
 */

export async function createRoutineDay(
  input: CreateRoutineDayInput,
): Promise<RoutineDay> {
  validateName(
    input.name,
    'El nombre del día',
  )

  validateDayOfWeek(
    input.dayOfWeek,
  )

  const routine =
    await db.routines.get(
      input.routineId,
    )

  if (
    !routine ||
    routine.deletedAt
  ) {
    throw new Error(
      'No se encontró la rutina activa.',
    )
  }

  const currentDays =
    await getRoutineDays(
      input.routineId,
    )

  const nextOrder =
    input.order ??
    (
      currentDays.length === 0
        ? 1
        : Math.max(
            ...currentDays.map(
              (day) =>
                day.order,
            ),
          ) + 1
    )

  const now =
    new Date().toISOString()

  const routineDay: RoutineDay = {
    id: crypto.randomUUID(),

    routineId:
      input.routineId,

    name:
      input.name.trim(),

    dayOfWeek:
      input.dayOfWeek,

    order:
      nextOrder,

    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',

    db.routineDays,
    db.routines,

    async () => {
      await db.routineDays.add(
        routineDay,
      )

      await touchRoutine(
        input.routineId,
      )
    },
  )

  return routineDay
}

export async function getRoutineDays(
  routineId: string,
): Promise<RoutineDay[]> {
  const days =
    await db.routineDays
      .where('routineId')
      .equals(routineId)
      .filter(
        (day) =>
          !day.deletedAt,
      )
      .toArray()

  return days.sort(
    (a, b) =>
      a.order - b.order,
  )
}

export async function getDeletedRoutineDays(
  routineId: string,
): Promise<RoutineDay[]> {
  const days =
    await db.routineDays
      .where('routineId')
      .equals(routineId)
      .filter(
        (day) =>
          Boolean(
            day.deletedAt,
          ),
      )
      .toArray()

  return days.sort(
    (a, b) =>
      a.order - b.order,
  )
}

export async function getRoutineDayById(
  id: string,
): Promise<
  RoutineDay | undefined
> {
  return db.routineDays.get(id)
}

export async function updateRoutineDay(
  id: string,
  input: UpdateRoutineDayInput,
): Promise<RoutineDay> {
  const existingDay =
    await db.routineDays.get(
      id,
    )

  if (!existingDay) {
    throw new Error(
      'No se encontró el día de la rutina.',
    )
  }

  if (existingDay.deletedAt) {
    throw new Error(
      'No puedes editar un día eliminado.',
    )
  }

  const name =
    input.name !== undefined
      ? input.name.trim()
      : existingDay.name

  validateName(
    name,
    'El nombre del día',
  )

  const dayOfWeek =
    input.dayOfWeek !==
    undefined
      ? input.dayOfWeek
      : existingDay.dayOfWeek

  validateDayOfWeek(
    dayOfWeek,
  )

  const updated: RoutineDay = {
    ...existingDay,

    name,

    dayOfWeek,

    order:
      input.order ??
      existingDay.order,

    updatedAt:
      new Date().toISOString(),
  }

  await db.transaction(
    'rw',

    db.routineDays,
    db.routines,

    async () => {
      await db.routineDays.put(
        updated,
      )

      await touchRoutine(
        existingDay.routineId,
      )
    },
  )

  return updated
}

export async function deleteRoutineDay(
  id: string,
): Promise<void> {
  const day =
    await db.routineDays.get(
      id,
    )

  if (!day) {
    throw new Error(
      'No se encontró el día de la rutina.',
    )
  }

  if (day.deletedAt) {
    return
  }

  const now =
    new Date().toISOString()

  await db.transaction(
    'rw',

    db.routineDays,
    db.routines,

    async () => {
      await db.routineDays.update(
        id,
        {
          deletedAt: now,
          updatedAt: now,
        },
      )

      await touchRoutine(
        day.routineId,
      )
    },
  )
}

export async function restoreRoutineDay(
  id: string,
): Promise<RoutineDay> {
  const day =
    await db.routineDays.get(
      id,
    )

  if (!day) {
    throw new Error(
      'No se encontró el día de la rutina.',
    )
  }

  if (!day.deletedAt) {
    return day
  }

  const restored: RoutineDay = {
    ...day,

    deletedAt:
      undefined,

    updatedAt:
      new Date().toISOString(),
  }

  await db.transaction(
    'rw',

    db.routineDays,
    db.routines,

    async () => {
      await db.routineDays.put(
        restored,
      )

      await touchRoutine(
        day.routineId,
      )
    },
  )

  return restored
}

/*
 * =====================================
 * ROUTINE EXERCISE
 * =====================================
 */

export async function createRoutineExercise(
  input: CreateRoutineExerciseInput,
): Promise<RoutineExercise> {
  validateRoutineExerciseValues({
    sets: input.sets,
    minReps:
      input.minReps,
    maxReps:
      input.maxReps,
    targetRIR:
      input.targetRIR,
    restSeconds:
      input.restSeconds,
  })

  const day =
    await db.routineDays.get(
      input.routineDayId,
    )

  if (
    !day ||
    day.deletedAt
  ) {
    throw new Error(
      'No se encontró el día de la rutina.',
    )
  }

  const exercise =
    await db.exercises.get(
      input.exerciseId,
    )

  if (
    !exercise ||
    exercise.deletedAt
  ) {
    throw new Error(
      'No se encontró el ejercicio.',
    )
  }

  if (input.variantId) {
    const variant =
      await db.exerciseVariants.get(
        input.variantId,
      )

    if (
      !variant ||
      variant.deletedAt ||
      variant.exerciseId !==
        input.exerciseId
    ) {
      throw new Error(
        'La variante seleccionada no es válida para este ejercicio.',
      )
    }
  }

  const currentExercises =
    await getRoutineExercises(
      input.routineDayId,
    )

  const nextOrder =
    input.order ??
    (
      currentExercises.length ===
      0
        ? 1
        : Math.max(
            ...currentExercises.map(
              (item) =>
                item.order,
            ),
          ) + 1
    )

  const now =
    new Date().toISOString()

  const routineExercise: RoutineExercise = {
    id: crypto.randomUUID(),

    routineDayId:
      input.routineDayId,

    exerciseId:
      input.exerciseId,

    variantId:
      input.variantId,

    order:
      nextOrder,

    sets:
      input.sets,

    minReps:
      input.minReps,

    maxReps:
      input.maxReps,

    targetRIR:
      input.targetRIR,

    restSeconds:
      input.restSeconds,

    notes:
      cleanOptionalText(
        input.notes,
      ),

    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',

    db.routineExercises,
    db.routines,

    async () => {
      await db.routineExercises.add(
        routineExercise,
      )

      await touchRoutine(
        day.routineId,
      )
    },
  )

  return routineExercise
}

export async function getRoutineExercises(
  routineDayId: string,
): Promise<RoutineExercise[]> {
  const exercises =
    await db.routineExercises
      .where('routineDayId')
      .equals(routineDayId)
      .filter(
        (item) =>
          !item.deletedAt,
      )
      .toArray()

  return exercises.sort(
    (a, b) =>
      a.order - b.order,
  )
}

export async function getDeletedRoutineExercises(
  routineDayId: string,
): Promise<RoutineExercise[]> {
  const exercises =
    await db.routineExercises
      .where('routineDayId')
      .equals(routineDayId)
      .filter(
        (item) =>
          Boolean(
            item.deletedAt,
          ),
      )
      .toArray()

  return exercises.sort(
    (a, b) =>
      a.order - b.order,
  )
}

export async function getRoutineExerciseById(
  id: string,
): Promise<
  RoutineExercise | undefined
> {
  return db.routineExercises.get(
    id,
  )
}

export async function updateRoutineExercise(
  id: string,
  input: UpdateRoutineExerciseInput,
): Promise<RoutineExercise> {
  const existing =
    await db.routineExercises.get(
      id,
    )

  if (!existing) {
    throw new Error(
      'No se encontró el ejercicio de la rutina.',
    )
  }

  if (existing.deletedAt) {
    throw new Error(
      'No puedes editar un ejercicio eliminado de la rutina.',
    )
  }

  const exerciseId =
    input.exerciseId ??
    existing.exerciseId

  const exercise =
    await db.exercises.get(
      exerciseId,
    )

  if (
    !exercise ||
    exercise.deletedAt
  ) {
    throw new Error(
      'No se encontró el ejercicio seleccionado.',
    )
  }

  const variantId =
    input.variantId !==
    undefined
      ? input.variantId
      : existing.variantId

  if (variantId) {
    const variant =
      await db.exerciseVariants.get(
        variantId,
      )

    if (
      !variant ||
      variant.deletedAt ||
      variant.exerciseId !==
        exerciseId
    ) {
      throw new Error(
        'La variante seleccionada no corresponde al ejercicio.',
      )
    }
  }

  const sets =
    input.sets ??
    existing.sets

  const minReps =
    input.minReps ??
    existing.minReps

  const maxReps =
    input.maxReps ??
    existing.maxReps

  const targetRIR =
    input.targetRIR !==
    undefined
      ? input.targetRIR
      : existing.targetRIR

  const restSeconds =
    input.restSeconds ??
    existing.restSeconds

  validateRoutineExerciseValues({
    sets,
    minReps,
    maxReps,
    targetRIR,
    restSeconds,
  })

  const updated: RoutineExercise = {
    ...existing,

    exerciseId,

    variantId,

    order:
      input.order ??
      existing.order,

    sets,

    minReps,

    maxReps,

    targetRIR,

    restSeconds,

    notes:
      input.notes !== undefined
        ? cleanOptionalText(
            input.notes,
          )
        : existing.notes,

    updatedAt:
      new Date().toISOString(),
  }

  const day =
    await db.routineDays.get(
      existing.routineDayId,
    )

  await db.transaction(
    'rw',

    db.routineExercises,
    db.routines,

    async () => {
      await db.routineExercises.put(
        updated,
      )

      if (day) {
        await touchRoutine(
          day.routineId,
        )
      }
    },
  )

  return updated
}

export async function deleteRoutineExercise(
  id: string,
): Promise<void> {
  const existing =
    await db.routineExercises.get(
      id,
    )

  if (!existing) {
    throw new Error(
      'No se encontró el ejercicio de la rutina.',
    )
  }

  if (existing.deletedAt) {
    return
  }

  const day =
    await db.routineDays.get(
      existing.routineDayId,
    )

  const now =
    new Date().toISOString()

  await db.transaction(
    'rw',

    db.routineExercises,
    db.routines,

    async () => {
      await db.routineExercises.update(
        id,
        {
          deletedAt: now,
          updatedAt: now,
        },
      )

      if (day) {
        await touchRoutine(
          day.routineId,
        )
      }
    },
  )
}

export async function restoreRoutineExercise(
  id: string,
): Promise<RoutineExercise> {
  const existing =
    await db.routineExercises.get(
      id,
    )

  if (!existing) {
    throw new Error(
      'No se encontró el ejercicio de la rutina.',
    )
  }

  if (!existing.deletedAt) {
    return existing
  }

  const day =
    await db.routineDays.get(
      existing.routineDayId,
    )

  const restored: RoutineExercise = {
    ...existing,

    deletedAt:
      undefined,

    updatedAt:
      new Date().toISOString(),
  }

  await db.transaction(
    'rw',

    db.routineExercises,
    db.routines,

    async () => {
      await db.routineExercises.put(
        restored,
      )

      if (day) {
        await touchRoutine(
          day.routineId,
        )
      }
    },
  )

  return restored
}