import { db } from '../db/database'
import type { ExerciseCategory, SetLog, Workout, WorkoutExercise } from '../types/domain'

export type StatisticsPeriod = 'week' | 'month'
export type StatisticsMetric = 'sessions' | 'sets' | 'volume'

export type CategoryStatistics = {
  category: string
  series: number
  repetitions: number
  volumeKg: number
}

export type PeriodStatistics = {
  key: string
  startsOn: string
  endsOn: string
  title: string
  shortTitle: string
  completedSessions: number
  sessionsWithSets: number
  trainingDays: number
  workingSets: number
  repetitions: number
  volumeKg: number
  uniqueExercises: number
  categories: CategoryStatistics[]
}

export type TrainingStatistics = {
  period: StatisticsPeriod
  // Incluye un período anterior a los 12 visibles para comparar sin falsear el primer gráfico.
  periods: PeriodStatistics[]
  today: string
}

type MutablePeriod = Omit<PeriodStatistics, 'categories' | 'uniqueExercises' | 'trainingDays' | 'sessionsWithSets'> & {
  dates: Set<string>
  workoutsWithSets: Set<string>
  exerciseIds: Set<string>
  categoryData: Map<string, CategoryStatistics>
}

const DAY_MS = 86_400_000

function parseIsoDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null
  return parsed
}

function isoDay(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function todayLocal(): string {
  const now = new Date()
  return [
    now.getFullYear().toString().padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function startOf(date: Date, period: StatisticsPeriod): Date {
  if (period === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  // ISO week: lunes a domingo (independiente de la zona horaria y horario de verano).
  const dayOfWeek = (date.getUTCDay() + 6) % 7
  return new Date(date.getTime() - dayOfWeek * DAY_MS)
}

function movePeriod(date: Date, period: StatisticsPeriod, amount: number): Date {
  if (period === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
  return new Date(date.getTime() + amount * 7 * DAY_MS)
}

function displayDay(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(date)
}

function makePeriod(start: Date, period: StatisticsPeriod): MutablePeriod {
  const endExclusive = movePeriod(start, period, 1)
  const endInclusive = new Date(endExclusive.getTime() - DAY_MS)
  const label = period === 'week'
    ? `${displayDay(start)} – ${displayDay(endInclusive)}`
    : new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(start)
  const short = period === 'week'
    ? displayDay(start)
    : new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', month: 'short', year: '2-digit' }).format(start)

  return {
    key: isoDay(start),
    startsOn: isoDay(start),
    endsOn: isoDay(endInclusive),
    title: label,
    shortTitle: short,
    completedSessions: 0,
    workingSets: 0,
    repetitions: 0,
    volumeKg: 0,
    dates: new Set(),
    workoutsWithSets: new Set(),
    exerciseIds: new Set(),
    categoryData: new Map(),
  }
}

function isValidWorkingSet(log: SetLog): boolean {
  return !log.deletedAt && log.setType === 'working' &&
    Number.isFinite(log.weight) && log.weight >= 0 &&
    Number.isInteger(log.reps) && log.reps > 0
}

/**
 * Métricas de lectura exclusivamente. No crea registros, no modifica el esquema.
 * Una sesión finalizada cuenta para frecuencia aunque no tenga series guardadas;
 * solo series de trabajo válidas suman volumen, repeticiones y series.
 */
export async function getTrainingStatistics(period: StatisticsPeriod): Promise<TrainingStatistics> {
  const today = todayLocal()
  const date = parseIsoDay(today)!
  const currentStart = startOf(date, period)
  const buckets: MutablePeriod[] = Array.from({ length: 13 }, (_, index) =>
    makePeriod(movePeriod(currentStart, period, index - 12), period),
  )
  const byPeriod = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  const firstDay = buckets[0].startsOn

  const data = await db.transaction('r', db.workouts, db.workoutExercises, db.setLogs, db.exercises, async () => {
    const [workouts, workoutExercises, logs, exerciseLibrary] = await Promise.all([
      db.workouts.toArray(),
      db.workoutExercises.toArray(),
      db.setLogs.toArray(),
      db.exercises.toArray(),
    ])
    return { workouts, workoutExercises, logs, exerciseLibrary }
  })

  const workoutsById = new Map<string, Workout>()
  for (const workout of data.workouts) {
    if (workout.deletedAt || workout.status !== 'completed') continue
    if (!parseIsoDay(workout.date) || workout.date < firstDay || workout.date > today) continue
    const bucket = byPeriod.get(isoDay(startOf(parseIsoDay(workout.date)!, period)))
    if (!bucket) continue
    bucket.completedSessions += 1
    bucket.dates.add(workout.date)
    workoutsById.set(workout.id, workout)
  }

  const categories = new Map(data.exerciseLibrary.map((exercise) => [exercise.id, exercise.category]))
  const instances = new Map<string, WorkoutExercise>()
  for (const exercise of data.workoutExercises) {
    if (!exercise.deletedAt && workoutsById.has(exercise.workoutId)) {
      instances.set(exercise.id, exercise)
    }
  }

  for (const log of data.logs) {
    if (!isValidWorkingSet(log)) continue
    const exercise = instances.get(log.workoutExerciseId)
    if (!exercise) continue
    const workout = workoutsById.get(exercise.workoutId)
    if (!workout) continue
    const bucket = byPeriod.get(isoDay(startOf(parseIsoDay(workout.date)!, period)))
    if (!bucket) continue

    const volume = log.weight * log.reps
    if (!Number.isFinite(volume)) continue
    bucket.workingSets += 1
    bucket.repetitions += log.reps
    bucket.volumeKg += volume
    bucket.workoutsWithSets.add(workout.id)
    bucket.exerciseIds.add(exercise.exerciseId)

    const category: ExerciseCategory | 'Sin categoría' = categories.get(exercise.exerciseId) ?? 'Sin categoría'
    let part = bucket.categoryData.get(category)
    if (!part) {
      part = { category, series: 0, repetitions: 0, volumeKg: 0 }
      bucket.categoryData.set(category, part)
    }
    part.series += 1
    part.repetitions += log.reps
    part.volumeKg += volume
  }

  return {
    period,
    today,
    periods: buckets.map((bucket): PeriodStatistics => ({
      key: bucket.key,
      startsOn: bucket.startsOn,
      endsOn: bucket.endsOn,
      title: bucket.title,
      shortTitle: bucket.shortTitle,
      completedSessions: bucket.completedSessions,
      sessionsWithSets: bucket.workoutsWithSets.size,
      trainingDays: bucket.dates.size,
      workingSets: bucket.workingSets,
      repetitions: bucket.repetitions,
      volumeKg: Math.round(bucket.volumeKg * 100) / 100,
      uniqueExercises: bucket.exerciseIds.size,
      categories: [...bucket.categoryData.values()].sort((a, b) => b.series - a.series || a.category.localeCompare(b.category, 'es')),
    })),
  }
}
