import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Dumbbell,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import {
  getStrengthOverview,
  type StrengthExercise,
  type StrengthOverview,
  type StrengthSession,
} from '../services/strengthProgressService'

type Metric = 'weight' | 'volume' | 'estimated'

const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const muted = 'text-[var(--color-text-secondary)]'
const heading = 'text-[var(--color-text-primary)]'

function number(value: number, digits = 1) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

function dateLabel(date: string): string {
  const parts = date.split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return date
  const [y, m, d] = parts
  const value = new Date(y, m - 1, d)
  if (value.getFullYear() !== y || value.getMonth() !== m - 1 || value.getDate() !== d) return date
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(value)
}

function metricValue(session: StrengthSession, metric: Metric): number | null {
  if (metric === 'estimated') return session.estimatedOneRepMaxKg
  if (metric === 'volume') return session.volumeKg
  return session.maxWeightKg
}

function metricName(metric: Metric): string {
  if (metric === 'estimated') return 'Fuerza estimada (1RM)'
  if (metric === 'volume') return 'Volumen por sesión'
  return 'Peso máximo por sesión'
}

function metricUnit(metric: Metric): string {
  return metric === 'volume' ? 'kg·reps' : 'kg'
}

function StrengthLineChart({ sessions, metric }: { sessions: StrengthSession[]; metric: Metric }) {
  const data = sessions
    .map((session) => ({ session, value: metricValue(session, metric) }))
    .filter((point): point is { session: StrengthSession; value: number } => point.value !== null)
    .slice(-16)

  if (data.length === 0) {
    return (
      <p className={`rounded-xl bg-[var(--color-surface-soft)] p-4 text-sm ${muted}`}>
        Todavía no hay datos válidos para este gráfico. Guarda series efectivas en entrenamientos finalizados.
      </p>
    )
  }

  const width = 640
  const height = 250
  const left = 76
  const right = 18
  const top = 20
  const bottom = 44
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const values = data.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, Math.max(max, 1) * 0.08, 1)
  const yMin = Math.max(0, min - pad)
  const yMax = max + pad
  const x = (index: number) => left + (data.length === 1 ? chartWidth / 2 : chartWidth * index / (data.length - 1))
  const y = (value: number) => top + chartHeight * (1 - (value - yMin) / (yMax - yMin))
  const path = data.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')

  return (
    <div className="overflow-x-auto" role="group" aria-label={`Gráfico de ${metricName(metric).toLowerCase()}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[300px] w-full" role="img"
        aria-label={`${metricName(metric)}. ${data.length} sesiones; de ${number(data[0].value)} a ${number(data[data.length - 1].value)} ${metricUnit(metric)}.`}>
        {Array.from({ length: 4 }, (_, index) => {
          const value = yMin + (yMax - yMin) * index / 3
          const positionY = y(value)
          return (
            <g key={index}>
              <line x1={left} x2={width - right} y1={positionY} y2={positionY}
                stroke="var(--color-border)" strokeDasharray="4 5" />
              <text x={left - 9} y={positionY + 4} textAnchor="end" fontSize="13"
                fill="var(--color-text-secondary)">{number(value)}</text>
            </g>
          )
        })}
        {data.length > 1 && (
          <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3.5"
            strokeLinejoin="round" strokeLinecap="round" points={path} />
        )}
        {data.map((point, index) => (
          <circle key={point.session.workoutId} cx={x(index)} cy={y(point.value)} r="5"
            fill="var(--color-button-primary)" stroke="var(--color-primary)" strokeWidth="2">
            <title>{`${dateLabel(point.session.date)}: ${number(point.value)} ${metricUnit(metric)}`}</title>
          </circle>
        ))}
        <text x={x(0)} y={height - 12} textAnchor={data.length === 1 ? 'middle' : 'start'}
          fill="var(--color-text-secondary)" fontSize="13">{dateLabel(data[0].session.date)}</text>
        {data.length > 1 && (
          <text x={x(data.length - 1)} y={height - 12} textAnchor="end"
            fill="var(--color-text-secondary)" fontSize="13">
            {dateLabel(data[data.length - 1].session.date)}
          </text>
        )}
      </svg>
      <p className={`text-center text-xs ${muted}`}>
        Cada punto es una sesión; se muestran las últimas 16 con registros válidos.
      </p>
    </div>
  )
}

function RecordCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="min-w-0 space-y-1 rounded-xl bg-[var(--color-surface-soft)] p-3">
      <p className={`text-xs font-semibold ${muted}`}>{label}</p>
      <p className={`break-words text-xl font-extrabold tabular-nums ${heading}`}>{value}</p>
      <p className={`text-xs ${muted}`}>{subtitle}</p>
    </div>
  )
}

export default function StrengthProgressPage() {
  const [overview, setOverview] = useState<StrengthOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selectedKey, setSelectedKey] = useState('')
  const [query, setQuery] = useState('')
  const [metric, setMetric] = useState<Metric>('weight')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getStrengthOverview()
        if (cancelled) return
        setOverview(result)
        setSelectedKey((before) => result.exercises.some((item) => item.key === before)
          ? before : (result.exercises[0]?.key ?? ''))
        setError('')
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo calcular tu progreso.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [revision])

  const options = useMemo(() => (overview?.exercises ?? []).filter((item) =>
    `${item.name} ${item.variantName ?? ''}`.toLocaleLowerCase('es')
      .includes(query.trim().toLocaleLowerCase('es')),
  ), [overview, query])

  const selected: StrengthExercise | undefined = overview?.exercises.find((item) => item.key === selectedKey)

  function reload() {
    setLoading(true)
    setRevision((current) => current + 1)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary)]">TU EVOLUCIÓN</p>
          <h1 className={`mt-1 text-3xl font-extrabold ${heading}`}>Progreso de fuerza</h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Gráficos y récords calculados con tus entrenamientos finalizados.
          </p>
        </div>
        <button type="button" onClick={reload} disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {loading && <p role="status" className={`py-5 text-center text-sm ${muted}`}>Calculando tu progreso…</p>}

      {!loading && !error && overview && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <RecordCard label="Sesiones con series" value={number(overview.loggedWorkouts, 0)}
              subtitle={`${overview.completedWorkouts} finalizadas`} />
            <RecordCard label="Series efectivas" value={number(overview.recordedWorkingSets, 0)} subtitle="Sin calentamientos" />
            <RecordCard label="Ejercicios" value={number(overview.exercises.length, 0)} subtitle="Con series registradas" />
          </div>

          {overview.exercises.length === 0 ? (
            <div className={`${card} space-y-2 text-center`}>
              <Dumbbell size={30} className="mx-auto text-[var(--color-primary)]" />
              <h2 className={`text-lg font-bold ${heading}`}>Aún no hay series para analizar</h2>
              <p className={`text-sm ${muted}`}>
                Registra una serie de trabajo y finaliza el entrenamiento. Después aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              <div className={`${card} space-y-3`}>
                <label htmlFor="strength-search" className={`block text-sm font-bold ${heading}`}>
                  Buscar ejercicio
                </label>
                <input id="strength-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hip thrust, prensa, remo…"
                  className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]" />
                <label htmlFor="strength-exercise" className={`block text-sm font-bold ${heading}`}>
                  Ejercicio a analizar
                </label>
                <select id="strength-exercise" value={options.some((item) => item.key === selectedKey) ? selectedKey : ''}
                  onChange={(event) => { setSelectedKey(event.target.value); setMetric('weight') }}
                  className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]">
                  {!options.some((item) => item.key === selectedKey) && <option value="">Selecciona un ejercicio</option>}
                  {options.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name}{item.variantName ? ` · ${item.variantName}` : ''} ({item.sessions.length})
                    </option>
                  ))}
                </select>
                {options.length === 0 && <p className={`text-sm ${muted}`}>No hay ejercicios que coincidan con esa búsqueda.</p>}
                {selected && <p className={`text-xs ${muted}`}>
                  {selected.sessions.length} {selected.sessions.length === 1 ? 'sesión' : 'sesiones'} con series efectivas · {selected.totalSets} series registradas.
                </p>}
              </div>

              {selected && options.some((item) => item.key === selectedKey) && (
                <>
                  <div className={`${card} space-y-4`}>
                    <div className="flex items-center gap-2">
                      <Trophy size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
                      <h2 className={`text-lg font-bold ${heading}`}>Mis mejores registros</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <RecordCard label={selected.assisted ? 'Mayor asistencia' : 'Peso máximo'}
                        value={`${number(selected.maxWeight.kg)} kg`}
                        subtitle={`${selected.maxWeight.reps} reps · ${dateLabel(selected.maxWeight.date)}`} />
                      <RecordCard label="Mayor volumen / sesión" value={`${number(selected.maxSessionVolume.kgReps, 0)} kg·reps`}
                        subtitle={dateLabel(selected.maxSessionVolume.date)} />
                      <RecordCard label="1RM estimada"
                        value={selected.bestEstimatedOneRepMax ? `${number(selected.bestEstimatedOneRepMax.kg)} kg` : '—'}
                        subtitle={selected.bestEstimatedOneRepMax
                          ? dateLabel(selected.bestEstimatedOneRepMax.date)
                          : selected.assisted ? 'No aplica a asistencia' : 'Sin series válidas de 1 a 12 reps'} />
                    </div>
                    {selected.assisted && (
                      <p className={`rounded-xl bg-[var(--color-surface-soft)] p-3 text-xs ${muted}`}>
                        Ejercicio asistido: los kg registrados pueden ser de <strong>asistencia</strong>. Menos asistencia suele representar mayor autonomía; no interpretes más kg como más fuerza.
                      </p>
                    )}
                  </div>

                  <div className={`${card} space-y-4`}>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
                      <h2 className={`text-lg font-bold ${heading}`}>Gráfico de evolución</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Qué dato mostrar en el gráfico">
                      {([
                        { id: 'weight' as const, label: selected.assisted ? 'Asistencia' : 'Peso' },
                        { id: 'volume' as const, label: 'Volumen' },
                        ...(!selected.assisted ? [{ id: 'estimated' as const, label: '1RM estimada' }] : []),
                      ]).map((option) => (
                        <button key={option.id} type="button" aria-pressed={metric === option.id}
                          onClick={() => setMetric(option.id)}
                          className={`min-h-11 rounded-xl px-2 py-2 text-sm font-bold transition ${metric === option.id
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)]'}`}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className={`flex items-center gap-2 text-sm font-semibold ${heading}`}>
                      <BarChart3 size={16} aria-hidden="true" /> {metricName(metric)} ({metricUnit(metric)})
                    </p>
                    <StrengthLineChart sessions={selected.sessions} metric={metric} />
                  </div>

                  <div className={`${card} space-y-3`}>
                    <h2 className={`text-lg font-bold ${heading}`}>Últimas sesiones</h2>
                    {[...selected.sessions].reverse().slice(0, 12).map((session) => (
                      <div key={session.workoutId} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className={`font-bold ${heading}`}>{dateLabel(session.date)}</p>
                          <span className={`text-xs ${muted}`}>{session.title}</span>
                        </div>
                        <p className={`mt-1 text-sm ${muted}`}>
                          {session.sets} series · {session.repetitions} reps · Máx. {number(session.maxWeightKg)} kg × {session.maxWeightReps}
                        </p>
                        <p className={`mt-1 text-sm ${muted}`}>
                          Volumen {number(session.volumeKg, 0)} kg·reps
                          {session.estimatedOneRepMaxKg !== null && ` · 1RM aprox. ${number(session.estimatedOneRepMaxKg)} kg`}
                        </p>
                      </div>
                    ))}
                    {selected.sessions.length > 12 && <p className={`text-xs ${muted}`}>Se muestran las últimas 12 sesiones en esta lista.</p>}
                  </div>
                </>
              )}
            </>
          )}
          <p className={`px-1 text-xs ${muted}`}>
            Solo se consideran series de trabajo válidas en sesiones finalizadas, no eliminadas.
            Volumen = peso × repeticiones. 1RM es una aproximación de Epley para series de 1 a 12 repeticiones;
            no es una medición real y puede ser poco comparable entre máquinas o técnicas distintas.
          </p>
        </>
      )}
    </section>
  )
}
