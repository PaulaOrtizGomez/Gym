import Dexie, {
  type Table,
} from 'dexie'

import type {
  AppSettings,
  BodyMeasurement,
  Exercise,
  ExerciseMedia,
  ExerciseVariant,
  ProgressPhoto,
  Routine,
  RoutineDay,
  RoutineExercise,
  SetLog,
  Workout,
  WorkoutExercise,
} from '../types/domain'

export const DB_SCHEMA_VERSION = 4

export type AppMetadata = {
  id: string

  schemaVersion: number
  appVersion: string

  createdAt: string
  updatedAt: string
}

class GymTrackerDatabase extends Dexie {
  appMetadata!: Table<
    AppMetadata,
    string
  >

  exercises!: Table<
    Exercise,
    string
  >

  exerciseVariants!: Table<
    ExerciseVariant,
    string
  >

  routines!: Table<
    Routine,
    string
  >

  routineDays!: Table<
    RoutineDay,
    string
  >

  routineExercises!: Table<
    RoutineExercise,
    string
  >

  workouts!: Table<
    Workout,
    string
  >

  workoutExercises!: Table<
    WorkoutExercise,
    string
  >

  setLogs!: Table<
    SetLog,
    string
  >

  bodyMeasurements!: Table<
    BodyMeasurement,
    string
  >

  progressPhotos!: Table<
    ProgressPhoto,
    string
  >

  exerciseMedia!: Table<
    ExerciseMedia,
    string
  >

  appSettings!: Table<
    AppSettings,
    string
  >

  constructor() {
    super('GymTrackerDB')

    /*
     * =====================================
     * VERSION 1
     * =====================================
     */

    this.version(1).stores({
      appMetadata:
        'id, schemaVersion, appVersion, updatedAt',
    })

    /*
     * =====================================
     * VERSION 2
     * =====================================
     */

    this.version(2).stores({
      appMetadata:
        'id, schemaVersion, appVersion, updatedAt',

      exercises:
        'id, name, category, favorite, deletedAt, updatedAt',

      exerciseVariants:
        'id, exerciseId, gym, machineName, deletedAt, updatedAt',

      routines:
        'id, name, active, version, deletedAt, updatedAt',

      routineDays:
        'id, routineId, dayOfWeek, order, [routineId+order]',

      routineExercises:
        'id, routineDayId, exerciseId, variantId, order, [routineDayId+order]',
    })

    /*
     * =====================================
     * VERSION 3
     * =====================================
     */

    this.version(3).stores({
      appMetadata:
        'id, schemaVersion, appVersion, updatedAt',

      exercises:
        'id, name, category, favorite, deletedAt, updatedAt',

      exerciseVariants:
        'id, exerciseId, gym, machineName, deletedAt, updatedAt',

      routines:
        'id, name, active, version, deletedAt, updatedAt',

      routineDays:
        'id, routineId, dayOfWeek, order, [routineId+order]',

      routineExercises:
        'id, routineDayId, exerciseId, variantId, order, [routineDayId+order]',

      workouts:
        'id, routineDayId, date, status, startTime, updatedAt',

      workoutExercises:
        'id, workoutId, exerciseId, variantId, order, status, [workoutId+order]',

      setLogs:
        'id, workoutExerciseId, setNumber, setType, completedAt, deletedAt, [workoutExerciseId+setNumber]',
    })

    /*
     * =====================================
     * VERSION 4
     * =====================================
     *
     * Agrega:
     *
     * - progreso corporal;
     * - fotos de progreso;
     * - multimedia de ejercicios;
     * - configuración visual;
     * - más soporte de borrado lógico.
     *
     * Los datos de las versiones anteriores
     * se mantienen.
     */

    this.version(
      DB_SCHEMA_VERSION,
    ).stores({
      appMetadata:
        'id, schemaVersion, appVersion, updatedAt',

      exercises:
        'id, name, category, favorite, deletedAt, updatedAt',

      exerciseVariants:
        'id, exerciseId, gym, machineName, deletedAt, updatedAt',

      routines:
        'id, name, active, version, deletedAt, updatedAt',

      routineDays:
        'id, routineId, dayOfWeek, order, deletedAt, updatedAt, [routineId+order]',

      routineExercises:
        'id, routineDayId, exerciseId, variantId, order, deletedAt, updatedAt, [routineDayId+order]',

      workouts:
        'id, routineDayId, date, status, startTime, deletedAt, updatedAt',

      workoutExercises:
        'id, workoutId, exerciseId, variantId, order, status, deletedAt, updatedAt, [workoutId+order]',

      setLogs:
        'id, workoutExerciseId, setNumber, setType, completedAt, deletedAt, [workoutExerciseId+setNumber]',

      bodyMeasurements:
        'id, date, weightKg, deletedAt, updatedAt',

      progressPhotos:
        'id, date, pose, bodyMeasurementId, order, deletedAt, [date+order]',

      exerciseMedia:
        'id, exerciseId, type, order, deletedAt, [exerciseId+order]',

      appSettings:
        'id, updatedAt',
    })
  }
}

export const db =
  new GymTrackerDatabase()