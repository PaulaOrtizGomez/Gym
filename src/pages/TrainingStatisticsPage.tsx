import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, CalendarDays, Dumbbell, RefreshCw, TrendingUp } from 'lucide-react'
import {
  getTrainingStatistics,
  type PeriodStatistics,
  type StatisticsMetric,
  type StatisticsPeriod,
  type TrainingStatistics,
} from '../services/trainingStatisticsService'

const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const secondary = 'text-[var(--color-text-secondary)]'
const primary = 'text-[var(--color-text-primary)]'

function number(value: number, decimals = 0): string {
  return value.toLocaleString('es-CL', { maximumFractionDigits: decimals })
}

function valueFor(period: PeriodStatistics, metric: StatisticsMetric): number {
  if (metric === 'sessions') return period.completedSessions
  if (metric === 'sets') return period.workingSets
  return period.volumeKg
}

function metricLabel(metric: StatisticsMetric): string {
  if (metric === 'sessions') return 'Sesiones finalizadas'
  if (metric === 'sets') return 'Series de trabajo'
  return 'Volumen registrado (kg·reps)'
}

function compare(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? 'Sin cambios (0)' : 'Período anterior: 0'
  const percentage = (current - previous) / previous * 100
  return `${percentage > 0 ? '+' : ''}${number(percentage, 1)}% frente al período anterior`
}

function SummaryCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--color-surface-soft)] p-3">
      <p className={`text-xs font-semibold ${secondary}`}>{title}</p>
      <p className={`mt-1 break-words text-xl font-extrabold tabular-nums ${primary}`}>{value}</p>
      <p className={`mt-1 text-xs ${secondary}`}>{note}</p>
    </div>
  )
}

function BarTimeline({
  data, metric, selectedKey, onSelect,
}: {
  data: PeriodStatistics[]
  metric: StatisticsMetric
  selectedKey: string
  onSelect: (key: string) => void
}) {
  const maxValue = Math.max(...data.map((item) => valueFor(item, metric)), 0)

  return (
    <div className="overflow-x-auto pb-2" aria-label={`Gráfico de ${metricLabel(metric)}. Selecciona un período para ver su detalle.`}>
      <div className="flex min-w-[675px] items-end gap-1.5" role="group" aria-label="Períodos del gráfico">
        {data.map((item) => {
          const metricValue = valueFor(item, metric)
          const height = maxValue > 0 && metricValue > 0 ? Math.max(4, Math.round((metricValue / maxValue) * 112)) : 0
          const selected = item.key === selectedKey
          return (
            <button type="button" key={item.key} onClick={() => onSelect(item.key)}
              aria-pressed={selected} aria-label={`${item.title}: ${number(metricValue, metric === 'volume' ? 1 : 0)} ${metricLabel(metric)}. ${selected ? 'Período seleccionado' : 'Seleccionar período'}`}
              className={`flex min-h-[166px] min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-lg px-1 pb-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${selected ? 'bg-[var(--color-surface-soft)] ring-2 ring-[var(--color-primary)]' : 'hover:bg-[var(--color-surface-soft)]'}`}>
              <span className={`text-[10px] font-semibold tabular-nums ${secondary}`}>{number(metricValue, 1)}</span>
              <span className={`w-full max-w-8 rounded-t-md ${selected ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-button-primary)]'}`}
                style={{ height: `${height}px` }} aria-hidden="true" />
              <span className={`text-center text-[10px] leading-tight ${selected ? `font-bold ${primary}` : secondary}`}>{item.shortTitle}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TrainingStatisticsPage() {
  const [period, setPeriod] = useState<StatisticsPeriod>('week')
  const [metric, setMetric] = useState<StatisticsMetric>('sessions')
  const [summary, setSummary] = useState<TrainingStatistics | null>(null)
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getTrainingStatistics(period)
        if (cancelled) return
        setSummary(result)
        setSelectedKey(result.periods[result.periods.length - 1]?.key ?? '')
        setError('')
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las estadísticas.')
          setSummary(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [period, revision])

  const visible = useMemo(() => summary?.periods.slice(1) ?? [], [summary])
  const selectedIndex = summary?.periods.findIndex((item) => item.key === selectedKey) ?? -1
  const selected = selectedIndex >= 0 ? summary?.periods[selectedIndex] : undefined
  const previous = selectedIndex > 0 ? summary?.periods[selectedIndex - 1] : undefined
  const latest = visible[visible.length - 1]?.key === selectedKey
  const hasData = visible.some((item) => item.completedSessions > 0)
  const totalSessions = visible.reduce((sum, item) => sum + item.completedSessions, 0)
  const totalSets = visible.reduce((sum, item) => sum + item.workingSets, 0)
  const totalVolume = visible.reduce((sum, item) => sum + item.volumeKg, 0)

  function changePeriod(next: StatisticsPeriod) {
    if (next === period) return
    setLoading(true)
    setPeriod(next)
  }

  function reload() {
    setLoading(true)
    setRevision((value) => value + 1)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary)]">TU CONSTANCIA</p>
          <h1 className={`mt-1 text-3xl font-extrabold ${primary}`}>Estadísticas</h1>
          <p className={`mt-2 text-sm ${secondary}`}>Frecuencia, series y volumen de tus entrenamientos finalizados.</p>
        </div>
        <button type="button" onClick={reload} disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </header>

      <div className={`${panel} space-y-3`}>
        <p className={`text-sm font-bold ${primary}`}>Ver estadísticas por</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de período">
          {([
            { value: 'week' as const, title: 'Semanas' },
            { value: 'month' as const, title: 'Meses' },
          ]).map((option) => (
            <button type="button" key={option.value} onClick={() => changePeriod(option.value)}
              aria-pressed={period === option.value}
              className={`min-h-11 rounded-xl px-3 py-2 font-bold ${period === option.value
                ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                : 'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)]'}`}>
              {option.title}
            </button>
          ))}
        </div>
      </div>

      {loading && <p role="status" className={`py-5 text-center text-sm ${secondary}`}>Calculando estadísticas…</p>}
      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {!loading && !error && summary && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard title="Sesiones" value={number(totalSessions)} note={`Últimas 12 ${period === 'week' ? 'semanas' : 'meses'}`} />
            <SummaryCard title="Series de trabajo" value={number(totalSets)} note="Sin calentamientos" />
            <SummaryCard title="Volumen" value={number(totalVolume, 1)} note="kg·reps registrados" />
          </div>

          {!hasData && (
            <div className={`${panel} space-y-2 text-center`}>
              <Dumbbell size={28} className="mx-auto text-[var(--color-primary)]" aria-hidden="true" />
              <p className={`font-bold ${primary}`}>Todavía no hay sesiones en este período</p>
              <p className={`text-sm ${secondary}`}>Cuando finalices entrenamientos, aparecerán aquí. Los períodos sin actividad se muestran con cero.</p>
            </div>
          )}

          <div className={`${panel} space-y-4`}>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className={`text-lg font-bold ${primary}`}>Evolución por período</h2>
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Métrica del gráfico">
              {([
                { value: 'sessions' as const, title: 'Sesiones' },
                { value: 'sets' as const, title: 'Series' },
                { value: 'volume' as const, title: 'Volumen' },
              ]).map((option) => (
                <button type="button" key={option.value} onClick={() => setMetric(option.value)}
                  aria-pressed={metric === option.value}
                  className={`min-h-11 rounded-xl px-2 py-2 text-sm font-bold ${metric === option.value
                    ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                    : 'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)]'}`}>
                  {option.title}
                </button>
              ))}
            </div>
            <p className={`text-sm font-semibold ${secondary}`}>{metricLabel(metric)} · toca una barra para ver el detalle</p>
            <BarTimeline data={visible} metric={metric} selectedKey={selectedKey} onSelect={setSelectedKey} />
          </div>

          {selected && (
            <div className={`${panel} space-y-4`}>
              <div className="flex items-center gap-2">
                <CalendarDays size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className={`text-lg font-bold ${primary}`}>{selected.title}</h2>
              </div>
              <p className={`text-xs ${secondary}`}>{selected.startsOn} a {selected.endsOn}{latest ? ' · período actual (incompleto)' : ''}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SummaryCard title="Sesiones finalizadas" value={number(selected.completedSessions)}
                  note={previous ? compare(selected.completedSessions, previous.completedSessions) : 'Sin período anterior'} />
                <SummaryCard title="Días entrenados" value={number(selected.trainingDays)} note="Fechas diferentes" />
                <SummaryCard title="Sesiones con series" value={number(selected.sessionsWithSets)} note="Con series válidas" />
                <SummaryCard title="Series de trabajo" value={number(selected.workingSets)}
                  note={previous ? compare(selected.workingSets, previous.workingSets) : 'Sin período anterior'} />
                <SummaryCard title="Repeticiones" value={number(selected.repetitions)} note={`${number(selected.uniqueExercises)} ejercicios distintos`} />
                <SummaryCard title="Volumen" value={`${number(selected.volumeKg, 1)} kg·reps`}
                  note={previous ? compare(selected.volumeKg, previous.volumeKg) : 'Sin período anterior'} />
              </div>
              {latest && (
                <p className={`rounded-xl bg-[var(--color-surface-soft)] p-3 text-xs ${secondary}`}>
                  Estás viendo una semana o mes en curso. Las comparaciones con períodos completos son orientativas.
                </p>
              )}
            </div>
          )}

          {selected && selected.categories.length > 0 && (
            <div className={`${panel} space-y-3`}>
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className={`text-lg font-bold ${primary}`}>Series por grupo muscular</h2>
              </div>
              {selected.categories.map((item) => (
                <div key={item.category} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3">
                  <span className={`text-sm font-semibold ${primary}`}>{item.category}</span>
                  <span className={`text-sm tabular-nums ${secondary}`}>
                    {number(item.series)} series · {number(item.volumeKg, 1)} kg·reps
                  </span>
                </div>
              ))}
              <p className={`text-xs ${secondary}`}>
                La categoría se toma de la biblioteca de ejercicios; si no está disponible, aparecerá «Sin categoría».
              </p>
            </div>
          )}

          <p className={`flex items-start gap-2 px-1 text-xs ${secondary}`}>
            <TrendingUp size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Solo se cuentan entrenamientos finalizados y no eliminados. El volumen es la suma de peso × repeticiones
            de las series de trabajo válidas; no incluye calentamientos ni peso corporal no registrado.
            El volumen entre máquinas o ejercicios diferentes no equivale directamente a progreso de fuerza.
          </p>
        </>
      )}
    </section>
  )
}
