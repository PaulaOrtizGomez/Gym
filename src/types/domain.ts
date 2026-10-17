export type ExerciseCategory =
  | 'Glúteos'
  | 'Cuádriceps'
  | 'Femoral'
  | 'Pantorrilla'
  | 'Espalda'
  | 'Pecho'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Cardio'
  | 'Otro'

export type Exercise = {
  id: string

  name: string
  category: ExerciseCategory

  movementPattern?: string
  equipment?: string
  instructions?: string
  notes?: string

  favorite: boolean

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type ExerciseVariant = {
  id: string

  exerciseId: string

  name: string

  gym?: string
  machineName?: string

  seatPosition?: string
  backrest?: string
  grip?: string
  cablePosition?: string

  weightIncrement?: number
  barWeight?: number

  notes?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type Routine = {
  id: string

  name: string
  description?: string

  active: boolean
  version: number

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type RoutineDay = {
  id: string

  routineId: string

  name: string

  dayOfWeek?: number

  order: number

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type RoutineExercise = {
  id: string

  routineDayId: string

  exerciseId: string
  variantId?: string

  order: number

  sets: number

  minReps: number
  maxReps: number

  targetRIR?: number

  restSeconds: number

  notes?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type WorkoutStatus =
  | 'inProgress'
  | 'completed'
  | 'discarded'

export type WorkoutExerciseStatus =
  | 'pending'
  | 'inProgress'
  | 'completed'
  | 'skipped'

export type SetType =
  | 'warmup'
  | 'working'

export type TechniqueQuality =
  | 'good'
  | 'acceptable'
  | 'poor'

export type Workout = {
  id: string

  routineDayId?: string

  routineNameSnapshot?: string
  routineDayNameSnapshot?: string

  date: string

  startTime: string
  endTime?: string

  status: WorkoutStatus

  notes?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type WorkoutExercise = {
  id: string

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

  status: WorkoutExerciseStatus

  notes?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

export type SetLog = {
  id: string

  workoutExerciseId: string

  setNumber: number

  setType: SetType

  weight: number
  reps: number

  rir?: number
  rpe?: number

  techniqueQuality?: TechniqueQuality

  completedAt: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

/*
 * =====================================
 * PROGRESO CORPORAL
 * =====================================
 */

export type BodyMeasurement = {
  id: string

  /*
   * Fecha local:
   * YYYY-MM-DD
   */
  date: string

  weightKg?: number

  waistCm?: number
  hipCm?: number
  chestCm?: number
  abdomenCm?: number

  thighLeftCm?: number
  thighRightCm?: number

  armLeftCm?: number
  armRightCm?: number

  calfLeftCm?: number
  calfRightCm?: number

  neckCm?: number

  bodyFatPct?: number

  /*
   * Permite agregar medidas nuevas
   * sin tener que modificar el schema
   * cada vez.
   *
   * Ejemplo:
   *
   * {
   *   "hombros": 110,
   *   "gluteoAlto": 108
   * }
   */
  customMeasurements?: Record<
    string,
    number
  >

  notes?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

/*
 * =====================================
 * FOTOS DE PROGRESO CORPORAL
 * =====================================
 */

export type ProgressPhotoPose =
  | 'front'
  | 'side'
  | 'back'
  | 'custom'

export type ProgressPhoto = {
  id: string

  /*
   * Fecha local:
   * YYYY-MM-DD
   */
  date: string

  pose: ProgressPhotoPose

  /*
   * Si la foto corresponde a un registro
   * de medidas del mismo día podemos
   * relacionarlos.
   *
   * Es opcional.
   */
  bodyMeasurementId?: string

  /*
   * La fotografía se guarda directamente
   * en IndexedDB para que funcione offline.
   */
  blob: Blob

  fileName: string
  mimeType: string
  fileSize: number

  /*
   * Nos servirá para ordenar varias fotos
   * del mismo día.
   */
  order: number

  note?: string

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

/*
 * =====================================
 * MULTIMEDIA DE EJERCICIOS
 * =====================================
 */

export type ExerciseMediaType =
  | 'image'
  | 'gif'
  | 'video'

export type ExerciseMedia = {
  id: string

  exerciseId: string

  type: ExerciseMediaType

  /*
   * Funciona offline porque el archivo
   * vive dentro de IndexedDB.
   */
  blob: Blob

  fileName: string
  mimeType: string
  fileSize: number

  order: number

  createdAt: string
  updatedAt: string

  deletedAt?: string
}

/*
 * =====================================
 * PERSONALIZACIÓN
 * =====================================
 */

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'

export type FontFamilyPreference =
  | 'nunito'
  | 'modern'
  | 'system'

export type FontScale =
  | 'small'
  | 'normal'
  | 'large'

export type AppSettings = {
  id: string

  themeMode: ThemeMode

  /*
   * Ejemplo:
   * #F3A4BD
   */
  accentColor: string

  fontFamily: FontFamilyPreference

  fontScale: FontScale

  updatedAt: string
}