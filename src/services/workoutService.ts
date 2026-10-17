
import { db } from '../db/database'

import type {
  SetLog,
  Workout,
  WorkoutExercise,
} from '../types/domain'

// ========================================
// TIPOS DE ENTRADA
// ========================================

type StartWorkoutInput = {
  routineDayId?: string
  routineNameSnapshot?: string
  routineDayNameSnapshot?: string
  notes?: string
}

type AddWorkoutExerciseInput = {
  workoutId: string
  exerciseId: string
  variantId?: string

  exerciseNameSnapshot: string
  variantNameSnapshot?: string

  plannedSetsSnapshot: number
  minRepsSnapshot: number
  maxRepsSnapshot: number
  targetRIRSnapshot?: number
  restSecondsSnapshot: number

  order: number
  notes?: string
}

type AddSetLogInput = {
  workoutExerciseId: string
  setNumber: number
  setType?: 'warmup' | 'working'

  weight: number
  reps: number
  rir?: number
  rpe?: number

  techniqueQuality?:
    | 'good'
    | 'acceptable'
    | 'poor'
}

type AddExerciseToWorkoutInput = {
  workoutId: string
  exerciseId: string
  variantId?: string

  sets?: number
  minReps?: number
  maxReps?: number
  targetRIR?: number
  restSeconds?: number
}

// ========================================
// FECHA LOCAL
// ========================================

function getLocalDate(date: Date): string {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// ========================================
// CREAR OBJETO WORKOUT
// ========================================

function makeWorkout(
  input: StartWorkoutInput,
): Workout {
  const now = new Date()
  const timestamp = now.toISOString()

  return {
    id: crypto.randomUUID(),

    routineDayId: input.routineDayId,

    routineNameSnapshot:
      input.routineNameSnapshot,

    routineDayNameSnapshot:
      input.routineDayNameSnapshot,

    date: getLocalDate(now),
    startTime: timestamp,
    status: 'inProgress',
    notes: input.notes,

    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

// ========================================
// VALIDAR PRESCRIPCIÓN
// ========================================

function validatePrescription(input: {
  sets: number
  minReps: number
  maxReps: number
  targetRIR?: number
  restSeconds: number
}) {
  if (
    !Number.isInteger(input.sets) ||
    input.sets < 1
  ) {
    throw new Error(
      'Las series deben ser un entero mayor que cero.',
    )
  }

  if (
    !Number.isInteger(input.minReps) ||
    input.minReps < 1 ||
    !Number.isInteger(input.maxReps) ||
    input.maxReps < input.minReps
  ) {
    throw new Error(
      'El rango de repeticiones no es válido.',
    )
  }

  if (
    input.targetRIR !== undefined &&
    (
      !Number.isInteger(input.targetRIR) ||
      input.targetRIR < 0 ||
      input.targetRIR > 10
    )
  ) {
    throw new Error(
      'El RIR debe estar entre 0 y 10.',
    )
  }

  if (
    !Number.isInteger(input.restSeconds) ||
    input.restSeconds < 0
  ) {
    throw new Error(
      'El descanso debe ser un entero mayor o igual a cero.',
    )
  }
}

// ========================================
// CREAR SNAPSHOT DE EJERCICIO
// ========================================

function makeWorkoutExercise(
  input: AddWorkoutExerciseInput,
  status: WorkoutExercise['status'] = 'pending',
): WorkoutExercise {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),

    workoutId: input.workoutId,
    exerciseId: input.exerciseId,
    variantId: input.variantId,

    exerciseNameSnapshot:
      input.exerciseNameSnapshot,

    variantNameSnapshot:
      input.variantNameSnapshot,

    plannedSetsSnapshot:
      input.plannedSetsSnapshot,

    minRepsSnapshot:
      input.minRepsSnapshot,

    maxRepsSnapshot:
      input.maxRepsSnapshot,

    targetRIRSnapshot:
      input.targetRIRSnapshot,

    restSecondsSnapshot:
      input.restSecondsSnapshot,

    order: input.order,
    status,
    notes: input.notes,

    createdAt: now,
    updatedAt: now,
  }
}

// ========================================
// CONSULTAR ENTRENAMIENTO ACTIVO
// ========================================

export async function getActiveWorkout(): Promise<
  Workout | undefined
> {
  return db.workouts
    .where('status')
    .equals('inProgress')
    .filter((workout) => !workout.deletedAt)
    .first()
}

// ========================================
// INICIO LEGACY
// MANTENER COMPATIBILIDAD CON APP.TSX
// ========================================

export async function startWorkout(
  input: StartWorkoutInput = {},
): Promise<Workout> {
  return db.transaction(
    'rw',
    db.workouts,
    async () => {
      const existing = await getActiveWorkout()

      if (existing) {
        throw new Error(
          'Ya tienes un entrenamiento en curso.',
        )
      }

      const workout = makeWorkout(input)

      await db.workouts.add(workout)

      return workout
    },
  )
}

export async function startOrResumeWorkout(
  input: StartWorkoutInput = {},
): Promise<Workout> {
  const active = await getActiveWorkout()

  return active ?? startWorkout(input)
}

// ========================================
// INICIAR DESDE UN DÍA REAL DE RUTINA
// ========================================

export async function startWorkoutFromRoutineDay(
  routineDayId: string,
): Promise<Workout> {
  return db.transaction(
    'rw',

    [
      db.workouts,
      db.workoutExercises,
      db.routines,
      db.routineDays,
      db.routineExercises,
      db.exercises,
      db.exerciseVariants,
    ],

    async () => {
      const existing = await getActiveWorkout()

      if (existing) {
        if (
          existing.routineDayId === routineDayId
        ) {
          return existing
        }

        throw new Error(
          'Ya existe un entrenamiento activo. Finalízalo antes de comenzar otro.',
        )
      }

      const day =
        await db.routineDays.get(routineDayId)

      if (!day || day.deletedAt) {
        throw new Error(
          'El día de rutina no existe o está eliminado.',
        )
      }

      const routine =
        await db.routines.get(day.routineId)

      if (!routine || routine.deletedAt) {
        throw new Error(
          'La rutina no existe o está eliminada.',
        )
      }

      const prescribed =
        await db.routineExercises
          .where('routineDayId')
          .equals(day.id)
          .filter((item) => !item.deletedAt)
          .sortBy('order')

      if (prescribed.length === 0) {
        throw new Error(
          'Agrega al menos un ejercicio al día antes de entrenar.',
        )
      }

      const workout = makeWorkout({
        routineDayId: day.id,

        routineNameSnapshot:
          routine.name,

        routineDayNameSnapshot:
          day.name,
      })

      const workoutExercises: WorkoutExercise[] = []

      for (const item of prescribed) {
        validatePrescription({
          sets: item.sets,
          minReps: item.minReps,
          maxReps: item.maxReps,
          targetRIR: item.targetRIR,
          restSeconds: item.restSeconds,
        })

        const exercise =
          await db.exercises.get(item.exerciseId)

        if (!exercise || exercise.deletedAt) {
          throw new Error(
            'Un ejercicio de este día ya no está disponible.',
          )
        }

        const variant = item.variantId
          ? await db.exerciseVariants.get(
              item.variantId,
            )
          : undefined

        if (
          item.variantId &&
          (
            !variant ||
            variant.deletedAt ||
            variant.exerciseId !== item.exerciseId
          )
        ) {
          throw new Error(
            `La variante de ${exercise.name} ya no está disponible.`,
          )
        }

        workoutExercises.push(
          makeWorkoutExercise({
            workoutId: workout.id,

            exerciseId: exercise.id,
            variantId: variant?.id,

            exerciseNameSnapshot:
              exercise.name,

            variantNameSnapshot:
              variant?.name,

            plannedSetsSnapshot:
              item.sets,

            minRepsSnapshot:
              item.minReps,

            maxRepsSnapshot:
              item.maxReps,

            targetRIRSnapshot:
              item.targetRIR,

            restSecondsSnapshot:
              item.restSeconds,

            order: item.order,
            notes: item.notes,
          }),
        )
      }

      await db.workouts.add(workout)

      await db.workoutExercises.bulkAdd(
        workoutExercises,
      )

      return workout
    },
  )
}

// ========================================
// AGREGAR WORKOUT EXERCISE
// ========================================

export async function addWorkoutExercise(
  input: AddWorkoutExerciseInput,
): Promise<WorkoutExercise> {
  validatePrescription({
    sets: input.plannedSetsSnapshot,
    minReps: input.minRepsSnapshot,
    maxReps: input.maxRepsSnapshot,
    targetRIR: input.targetRIRSnapshot,
    restSeconds: input.restSecondsSnapshot,
  })

  return db.transaction(
    'rw',

    db.workouts,
    db.workoutExercises,
    db.exercises,

    async () => {
      const workout =
        await db.workouts.get(input.workoutId)

      if (
        !workout ||
        workout.deletedAt ||
        workout.status !== 'inProgress'
      ) {
        throw new Error(
          'No hay un entrenamiento activo para añadir ejercicios.',
        )
      }

      const exercise =
        await db.exercises.get(input.exerciseId)

      if (!exercise || exercise.deletedAt) {
        throw new Error(
          'El ejercicio ya no está disponible en la biblioteca.',
        )
      }

      const siblings =
        await db.workoutExercises
          .where('workoutId')
          .equals(input.workoutId)
          .toArray()

      if (
        siblings.some(
          (item) =>
            !item.deletedAt &&
            item.order === input.order,
        )
      ) {
        throw new Error(
          'Ya existe un ejercicio con ese orden en la sesión.',
        )
      }

      const item = makeWorkoutExercise(input)

      await db.workoutExercises.add(item)

      return item
    },
  )
}

// ========================================
// AÑADIR EJERCICIO DURANTE ENTRENAMIENTO
// ========================================

export async function addExerciseToWorkout(
  input: AddExerciseToWorkoutInput,
): Promise<WorkoutExercise> {
  const exercise =
    await db.exercises.get(input.exerciseId)

  if (!exercise || exercise.deletedAt) {
    throw new Error(
      'Selecciona un ejercicio disponible.',
    )
  }

  const variant = input.variantId
    ? await db.exerciseVariants.get(
        input.variantId,
      )
    : undefined

  if (
    input.variantId &&
    (
      !variant ||
      variant.deletedAt ||
      variant.exerciseId !== exercise.id
    )
  ) {
    throw new Error(
      'La variante no corresponde al ejercicio.',
    )
  }

  const siblings =
    await getWorkoutExercises(input.workoutId)

  return addWorkoutExercise({
    workoutId: input.workoutId,

    exerciseId: exercise.id,
    variantId: variant?.id,

    exerciseNameSnapshot:
      exercise.name,

    variantNameSnapshot:
      variant?.name,

    plannedSetsSnapshot:
      input.sets ?? 3,

    minRepsSnapshot:
      input.minReps ?? 8,

    maxRepsSnapshot:
      input.maxReps ?? 12,

    targetRIRSnapshot:
      input.targetRIR ?? 2,

    restSecondsSnapshot:
      input.restSeconds ?? 120,

    order:
      Math.max(
        0,
        ...siblings.map((item) => item.order),
      ) + 1,
  })
}

// ========================================
// COMPATIBILIDAD TEMPORAL HIP THRUST
// ========================================

// Esta función se retirará cuando
// WorkoutPage utilice la rutina real.

export async function ensureHipThrustInWorkout(
  workoutId: string,
): Promise<WorkoutExercise> {
  const existing =
    (await getWorkoutExercises(workoutId))[0]

  if (existing) {
    return existing
  }

  const hipThrust =
    await db.exercises
      .where('name')
      .equals('Hip thrust')
      .filter((item) => !item.deletedAt)
      .first()

  if (!hipThrust) {
    throw new Error(
      'No se encontró Hip thrust en la biblioteca de ejercicios.',
    )
  }

  return addWorkoutExercise({
    workoutId,

    exerciseId: hipThrust.id,

    exerciseNameSnapshot:
      hipThrust.name,

    plannedSetsSnapshot: 3,
    minRepsSnapshot: 8,
    maxRepsSnapshot: 12,
    targetRIRSnapshot: 2,
    restSecondsSnapshot: 150,

    order: 1,
  })
}

// ========================================
// REGISTRAR SERIE
// ========================================

export async function addSetLog(
  input: AddSetLogInput,
): Promise<SetLog> {
  if (
    !Number.isInteger(input.setNumber) ||
    input.setNumber < 1
  ) {
    throw new Error(
      'El número de serie no es válido.',
    )
  }

  if (
    !Number.isFinite(input.weight) ||
    input.weight < 0
  ) {
    throw new Error(
      'El peso debe ser un número mayor o igual a cero.',
    )
  }

  if (
    !Number.isInteger(input.reps) ||
    input.reps < 1
  ) {
    throw new Error(
      'Las repeticiones deben ser un entero mayor que cero.',
    )
  }

  if (
    input.rir !== undefined &&
    (
      !Number.isInteger(input.rir) ||
      input.rir < 0 ||
      input.rir > 10
    )
  ) {
    throw new Error(
      'El RIR debe estar entre 0 y 10.',
    )
  }

  return db.transaction(
    'rw',

    db.workouts,
    db.workoutExercises,
    db.setLogs,

    async () => {
      const workoutExercise =
        await db.workoutExercises.get(
          input.workoutExerciseId,
        )

      if (
        !workoutExercise ||
        workoutExercise.deletedAt
      ) {
        throw new Error(
          'No se encontró el ejercicio del entrenamiento.',
        )
      }

      const workout =
        await db.workouts.get(
          workoutExercise.workoutId,
        )

      if (
        !workout ||
        workout.deletedAt ||
        workout.status !== 'inProgress'
      ) {
        throw new Error(
          'No se pueden guardar series en una sesión finalizada.',
        )
      }

      if (
        workoutExercise.status === 'skipped'
      ) {
        throw new Error(
          'El ejercicio fue omitido.',
        )
      }

      const existing =
        await db.setLogs
          .where('workoutExerciseId')
          .equals(input.workoutExerciseId)
          .filter((item) => !item.deletedAt)
          .toArray()

      if (
        existing.length >=
        workoutExercise.plannedSetsSnapshot
      ) {
        throw new Error(
          'Ya completaste todas las series planificadas.',
        )
      }

      if (
        existing.some(
          (item) =>
            item.setNumber === input.setNumber,
        )
      ) {
        throw new Error(
          `La serie ${input.setNumber} ya está guardada.`,
        )
      }

      const now = new Date().toISOString()

      const log: SetLog = {
        id: crypto.randomUUID(),

        workoutExerciseId:
          input.workoutExerciseId,

        setNumber: input.setNumber,

        setType:
          input.setType ?? 'working',

        weight: input.weight,
        reps: input.reps,
        rir: input.rir,
        rpe: input.rpe,

        techniqueQuality:
          input.techniqueQuality,

        completedAt: now,
        createdAt: now,
        updatedAt: now,
      }

      await db.setLogs.add(log)

      await db.workoutExercises.update(
        workoutExercise.id,
        {
          status:
            existing.length + 1 >=
            workoutExercise.plannedSetsSnapshot
              ? 'completed'
              : 'inProgress',

          updatedAt: now,
        },
      )

      return log
    },
  )
}

// ========================================
// FINALIZAR ENTRENAMIENTO
// ========================================

export async function finishWorkout(
  workoutId: string,
): Promise<Workout> {
  return db.transaction(
    'rw',

    db.workouts,
    db.workoutExercises,
    db.setLogs,

    async () => {
      const workout =
        await db.workouts.get(workoutId)

      if (!workout || workout.deletedAt) {
        throw new Error(
          'No se encontró el entrenamiento.',
        )
      }

      if (workout.status === 'completed') {
        return workout
      }

      if (workout.status !== 'inProgress') {
        throw new Error(
          'Este entrenamiento no se puede finalizar.',
        )
      }

      const exercises =
        await db.workoutExercises
          .where('workoutId')
          .equals(workoutId)
          .filter((item) => !item.deletedAt)
          .toArray()

      const now = new Date().toISOString()

      for (const exercise of exercises) {
        const count =
          await db.setLogs
            .where('workoutExerciseId')
            .equals(exercise.id)
            .filter((item) => !item.deletedAt)
            .count()

        await db.workoutExercises.update(
          exercise.id,
          {
            status:
              count > 0
                ? 'completed'
                : 'skipped',

            updatedAt: now,
          },
        )
      }

      const completed: Workout = {
        ...workout,

        status: 'completed',
        endTime: now,
        updatedAt: now,
      }

      await db.workouts.put(completed)

      return completed
    },
  )
}

// ========================================
// CONSULTAS DE ENTRENAMIENTO
// ========================================

export async function getWorkoutById(
  id: string,
): Promise<Workout | undefined> {
  return db.workouts.get(id)
}

export async function getWorkoutExerciseById(
  id: string,
): Promise<WorkoutExercise | undefined> {
  return db.workoutExercises.get(id)
}

export async function getWorkoutExercises(
  workoutId: string,
): Promise<WorkoutExercise[]> {
  return db.workoutExercises
    .where('workoutId')
    .equals(workoutId)
    .filter((item) => !item.deletedAt)
    .sortBy('order')
}

export async function getSetLogs(
  workoutExerciseId: string,
): Promise<SetLog[]> {
  return db.setLogs
    .where('workoutExerciseId')
    .equals(workoutExerciseId)
    .filter((item) => !item.deletedAt)
    .sortBy('setNumber')
}

// ========================================
// HISTORIAL DE ENTRENAMIENTOS
// ========================================

export async function getCompletedWorkouts(): Promise<
  Workout[]
> {
  const completed =
    await db.workouts
      .where('status')
      .equals('completed')
      .filter((item) => !item.deletedAt)
      .toArray()

  return completed.sort(
    (a, b) =>
      b.startTime.localeCompare(a.startTime),
  )
}
