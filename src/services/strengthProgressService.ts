import { db } from '../db/database'
import type { SetLog, Workout, WorkoutExercise } from '../types/domain'

/** Valores calculados de solo lectura. No se crean tablas ni registros nuevos. */
export type StrengthSession = {
  workoutId: string
  date: string
  title: string
  sets: number
  repetitions: number
  maxWeightKg: number
  maxWeightReps: number
  volumeKg: number
  estimatedOneRepMaxKg: number | null
}

export type StrengthExercise = {
  key: string
  exerciseId: string
  name: string
  variantName?: string
  assisted: boolean
  sessions: StrengthSession[]
  totalSets: number
  totalVolumeKg: number
  maxWeight: { kg: number; reps: number; date: string }
  maxSessionVolume: { kgReps: number; date: string }
  bestEstimatedOneRepMax: { kg: number; date: string } | null
}

export type StrengthOverview = {
  completedWorkouts: number
  loggedWorkouts: number
  recordedWorkingSets: number
  exercises: StrengthExercise[]
}

type MutableSession = StrengthSession & {
  hasWeight: boolean
}

type MutableExercise = {
  key: string
  exerciseId: string
  name: string
  variantName?: string
  assisted: boolean
  sessions: Map<string, MutableSession>
}

function isAssistedExercise(name: string): boolean {
  return /asistid|assist(ed)?/i.test(
    name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  )
}

function validWorkingSet(log: SetLog): boolean {
  return (
    !log.deletedAt &&
    log.setType === 'working' &&
    Number.isFinite(log.weight) &&
    log.weight >= 0 &&
    Number.isInteger(log.reps) &&
    log.reps > 0
  )
}

function sessionFor(
  item: MutableExercise,
  workout: Workout,
): MutableSession {
  const existing = item.sessions.get(workout.id)
  if (existing) return existing

  const fresh: MutableSession = {
    workoutId: workout.id,
    date: workout.date,
    title: workout.routineDayNameSnapshot || 'Entrenamiento',
    sets: 0,
    repetitions: 0,
    maxWeightKg: 0,
    maxWeightReps: 0,
    volumeKg: 0,
    estimatedOneRepMaxKg: null,
    hasWeight: false,
  }
  item.sessions.set(workout.id, fresh)
  return fresh
}

/**
 * Solo sesiones FINALIZADAS, ejercicios vigentes de esas sesiones y series
 * efectivas NO borradas. Las series de calentamiento no inflan los récords.
 * Se usan IDs y nombres históricos (snapshots), por lo que las rutinas
 * renombradas/eliminadas no rompen el historial.
 */
export async function getStrengthOverview(): Promise<StrengthOverview> {
  const { workouts, exercises, logs } = await db.transaction(
    'r', db.workouts, db.workoutExercises, db.setLogs,
    async () => {
      const [allWorkouts, allExercises, allLogs] = await Promise.all([
        db.workouts.toArray(),
        db.workoutExercises.toArray(),
        db.setLogs.toArray(),
      ])
      return { workouts: allWorkouts, exercises: allExercises, logs: allLogs }
    },
  )

  const completed = workouts.filter(
    (workout) => !workout.deletedAt && workout.status === 'completed',
  )
  const workoutsById = new Map(completed.map((workout) => [workout.id, workout]))
  const exercisesById = new Map<string, WorkoutExercise>()

  for (const exercise of exercises) {
    if (!exercise.deletedAt && workoutsById.has(exercise.workoutId)) {
      exercisesById.set(exercise.id, exercise)
    }
  }

  const grouped = new Map<string, MutableExercise>()
  const loggedWorkoutIds = new Set<string>()
  let recordedWorkingSets = 0

  for (const log of logs) {
    if (!validWorkingSet(log)) continue

    const exercise = exercisesById.get(log.workoutExerciseId)
    if (!exercise) continue

    const workout = workoutsById.get(exercise.workoutId)
    if (!workout) continue

    const key = JSON.stringify([exercise.exerciseId, exercise.variantId ?? null])
    let item = grouped.get(key)
    if (!item) {
      item = {
        key,
        exerciseId: exercise.exerciseId,
        name: exercise.exerciseNameSnapshot || 'Ejercicio sin nombre',
        variantName: exercise.variantNameSnapshot,
        assisted: isAssistedExercise(exercise.exerciseNameSnapshot),
        sessions: new Map(),
      }
      grouped.set(key, item)
    }

    const session = sessionFor(item, workout)
    const setVolume = log.weight * log.reps
    session.sets += 1
    session.repetitions += log.reps
    session.volumeKg += setVolume

    if (
      !session.hasWeight ||
      log.weight > session.maxWeightKg ||
      (log.weight === session.maxWeightKg && log.reps > session.maxWeightReps)
    ) {
      session.maxWeightKg = log.weight
      session.maxWeightReps = log.reps
      session.hasWeight = true
    }

    // Epley solo como estimación de carga adicional: no para asistidas,
    // ni para series de más de 12 repeticiones o sin peso registrado.
    if (!item.assisted && log.weight > 0 && log.reps <= 12) {
      const estimate = log.reps === 1 ? log.weight : log.weight * (1 + log.reps / 30)
      session.estimatedOneRepMaxKg = Math.max(
        session.estimatedOneRepMaxKg ?? 0,
        estimate,
      )
    }

    recordedWorkingSets += 1
    loggedWorkoutIds.add(workout.id)
  }

  const result: StrengthExercise[] = Array.from(grouped.values()).map((item) => {
    const sessions: StrengthSession[] = Array.from(item.sessions.values())
      .sort((a, b) => a.date.localeCompare(b.date) || a.workoutId.localeCompare(b.workoutId))
      .map((session) => ({
        workoutId: session.workoutId,
        date: session.date,
        title: session.title,
        sets: session.sets,
        repetitions: session.repetitions,
        maxWeightKg: session.maxWeightKg,
        maxWeightReps: session.maxWeightReps,
        volumeKg: session.volumeKg,
        estimatedOneRepMaxKg: session.estimatedOneRepMaxKg,
      }))

    const heaviest = sessions.reduce((best, session) =>
      session.maxWeightKg > best.maxWeightKg ||
      (session.maxWeightKg === best.maxWeightKg && session.maxWeightReps > best.maxWeightReps)
        ? session : best,
    )
    const mostVolume = sessions.reduce((best, session) =>
      session.volumeKg > best.volumeKg ? session : best,
    )
    const estimated = sessions
      .filter((session) => session.estimatedOneRepMaxKg !== null)
      .reduce<StrengthSession | null>((best, session) =>
        !best || (session.estimatedOneRepMaxKg ?? 0) > (best.estimatedOneRepMaxKg ?? 0)
          ? session : best, null)

    return {
      key: item.key,
      exerciseId: item.exerciseId,
      name: item.name,
      variantName: item.variantName,
      assisted: item.assisted,
      sessions,
      totalSets: sessions.reduce((sum, session) => sum + session.sets, 0),
      totalVolumeKg: sessions.reduce((sum, session) => sum + session.volumeKg, 0),
      maxWeight: {
        kg: heaviest.maxWeightKg,
        reps: heaviest.maxWeightReps,
        date: heaviest.date,
      },
      maxSessionVolume: { kgReps: mostVolume.volumeKg, date: mostVolume.date },
      bestEstimatedOneRepMax: estimated
        ? { kg: estimated.estimatedOneRepMaxKg!, date: estimated.date }
        : null,
    }
  })

  result.sort((a, b) => a.name.localeCompare(b.name, 'es') || (a.variantName ?? '').localeCompare(b.variantName ?? '', 'es'))

  return {
    completedWorkouts: completed.length,
    loggedWorkouts: loggedWorkoutIds.size,
    recordedWorkingSets,
    exercises: result,
  }
}
