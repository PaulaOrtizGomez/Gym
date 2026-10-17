import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  LineChart,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  Scale,
  Trash2,
  X,
} from 'lucide-react'

import type { BodyMeasurement } from '../types/domain'
import {
  BODY_FIELDS,
  deleteBodyMeasurement,
  getBodyMeasurements,
  saveBodyMeasurement,
} from '../services/bodyMeasurementService'
import type { BodyFieldKey, BodyMeasurementInput } from '../services/bodyMeasurementService'

const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const inputClass = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]'
const outlineButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-50'
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-button-primary)] px-4 py-2 font-bold text-[var(--color-button-text)] disabled:opacity-50'

// Los inputs conservan texto (incluida la coma decimal) hasta pulsar Guardar.
type FormData = {
  date: string
  values: Record<BodyFieldKey, string>
  custom: Array<{ uid: string; name: string; value: string }>
  notes: string
}

const displayNumber = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 2 })

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

function todayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function parseOptionalNumber(text: string, label: string): number | undefined {
  const raw = text.trim()
  if (!raw) return undefined
  const normalized = raw.replace(',', '.')
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    throw new Error(`${label}: introduce un número válido (puedes usar coma decimal).`)
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`${label}: introduce un número válido.`)
  return parsed
}

function newForm(): FormData {
  return {
    date: todayLocal(),
    values: Object.fromEntries(BODY_FIELDS.map(({ key }) => [key, ''])) as Record<BodyFieldKey, string>,
    custom: [],
    notes: '',
  }
}

function recordForm(record: BodyMeasurement): FormData {
  return {
    date: record.date,
    values: Object.fromEntries(BODY_FIELDS.map(({ key }) => [key, record[key] === undefined ? '' : String(record[key])])) as Record<BodyFieldKey, string>,
    custom: Object.entries(record.customMeasurements ?? {}).map(([name, value]) => ({
      uid: crypto.randomUUID(), name, value: String(value),
    })),
    notes: record.notes ?? '',
  }
}

function toPayload(form: FormData): BodyMeasurementInput {
  const values: Partial<Record<BodyFieldKey, number>> = {}
  for (const { key, label } of BODY_FIELDS) {
    values[key] = parseOptionalNumber(form.values[key], label)
  }

  const customMeasurements: Record<string, number> = {}
  const names = new Set<string>()
  for (const item of form.custom) {
    const name = item.name.trim()
    if (!name) throw new Error('Escribe un nombre para cada medida personalizada.')
    const normalized = name.toLocaleLowerCase('es-CL')
    if (names.has(normalized)) throw new Error('Hay medidas personalizadas con el mismo nombre.')
    names.add(normalized)
    const value = parseOptionalNumber(item.value, name)
    if (value === undefined) throw new Error(`Escribe el valor de ${name}.`)
    customMeasurements[name] = value
  }

  return {
    date: form.date,
    ...values,
    customMeasurements: Object.keys(customMeasurements).length > 0 ? customMeasurements : undefined,
    notes: form.notes.trim() || undefined,
  }
}

function measurementValue(record: BodyMeasurement, selected: string): number | undefined {
  if (selected.startsWith('custom:')) return record.customMeasurements?.[selected.slice(7)]
  if (BODY_FIELDS.some(({ key }) => key === selected)) return record[selected as BodyFieldKey]
  return undefined
}

function nameAndUnit(selected: string): { label: string; unit: string } {
  if (selected.startsWith('custom:')) return { label: selected.slice(7), unit: 'cm' }
  const field = BODY_FIELDS.find(({ key }) => key === selected)
  return field ? { label: field.label, unit: field.unit } : { label: selected, unit: 'cm' }
}

function TrendChart({ records, selected }: { records: BodyMeasurement[]; selected: string }) {
  const { label, unit } = nameAndUnit(selected)
  const points = records
    .filter((item) => measurementValue(item, selected) !== undefined)
    .map((item) => ({ date: item.date, value: measurementValue(item, selected)! }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (!points.length) {
    return <p className="rounded-xl bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-secondary)]">Todavía no tienes registros para {label.toLowerCase()}.</p>
  }

  const first = points[0]
  const last = points[points.length - 1]
  const difference = last.value - first.value
  const w = 640
  const h = 230
  const left = 65
  const right = 22
  const top = 24
  const bottom = 54
  const values = points.map(({ value }) => value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const padding = Math.max(range * 0.15, Math.max(maxValue, 1) * 0.025, 0.5)
  const yMin = Math.max(0, minValue - padding)
  const yMax = maxValue + padding
  const firstTimestamp = Date.parse(`${first.date}T12:00:00Z`)
  const lastTimestamp = Date.parse(`${last.date}T12:00:00Z`)
  const x = (date: string) => firstTimestamp === lastTimestamp
    ? (left + (w - right)) / 2
    : left + ((Date.parse(`${date}T12:00:00Z`) - firstTimestamp) / (lastTimestamp - firstTimestamp)) * (w - left - right)
  const y = (value: number) => top + ((yMax - value) / (yMax - yMin)) * (h - top - bottom)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.date)} ${y(point.value)}`).join(' ')
  const ticks = [0, 0.5, 1]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-text-secondary)]">Último registro</p>
          <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{displayNumber(last.value)} <span className="text-base font-normal">{unit}</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-secondary)]">Cambio desde el primer registro</p>
          <p className="font-bold text-[var(--color-text-primary)]">{points.length < 2 ? 'Falta otra medición' : `${difference > 0 ? '+' : ''}${displayNumber(difference)} ${unit}`}</p>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Evolución de ${label}: ${points.length} registros, desde ${displayNumber(first.value)} hasta ${displayNumber(last.value)} ${unit}.`} className="w-full min-w-[280px]">
          {ticks.map((t) => {
            const value = yMax - t * (yMax - yMin)
            const cy = top + t * (h - top - bottom)
            return (
              <g key={t}>
                <line x1={left} y1={cy} x2={w - right} y2={cy} stroke="var(--color-border)" strokeDasharray="4 5" />
                <text x={left - 10} y={cy + 5} fontSize="13" fill="var(--color-text-secondary)" textAnchor="end">{displayNumber(Number(value.toFixed(1)))}</text>
              </g>
            )
          })}
          <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle key={`${point.date}-${index}`} cx={x(point.date)} cy={y(point.value)} r="5" fill="var(--color-button-primary)" stroke="var(--color-primary)" strokeWidth="2">
              <title>{formatDate(point.date)}: {displayNumber(point.value)} {unit}</title>
            </circle>
          ))}
          <text x={left} y={h - 16} textAnchor="start" fontSize="13" fill="var(--color-text-secondary)">{formatDate(first.date)}</text>
          {first.date !== last.date && <text x={w - right} y={h - 16} textAnchor="end" fontSize="13" fill="var(--color-text-secondary)">{formatDate(last.date)}</text>}
        </svg>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">Cada punto representa una medición guardada. Las fechas se muestran según su separación real.</p>
    </div>
  )
}

export default function BodyProgressPage() {
  const [records, setRecords] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [form, setForm] = useState<FormData>(newForm)
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string>('weightKg')
  const [visibleCount, setVisibleCount] = useState(5)

  useEffect(() => {
    let cancelled = false
    getBodyMeasurements()
      .then((result) => {
        if (cancelled) return
        setRecords(result)
        setError('')
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo cargar Mi cuerpo.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [revision])

  const customNames = useMemo(() => Array.from(new Set(records.flatMap((row) => Object.keys(row.customMeasurements ?? {})))).sort((a, b) => a.localeCompare(b, 'es')), [records])
  const availableMetrics = useMemo(() => [
    ...BODY_FIELDS.filter(({ key }) => records.some((row) => row[key] !== undefined)).map(({ key, label, unit }) => ({ key, label: `${label} (${unit})` })),
    ...customNames.map((name) => ({ key: `custom:${name}`, label: `${name} (cm)` })),
  ], [records, customNames])
  const activeMetric = availableMetrics.some(({ key }) => key === selectedMetric) ? selectedMetric : availableMetrics[0]?.key ?? 'weightKg'
  const newest = records[0]

  function startNew() {
    setEditingId(undefined)
    setForm(newForm())
    setShowExtra(false)
    setShowForm(true)
    setDeleteId(null)
    setError('')
    setMessage('')
  }

  function startEditing(record: BodyMeasurement) {
    setEditingId(record.id)
    setForm(recordForm(record))
    setShowExtra(BODY_FIELDS.some((field) => field.group === 'adicional' && record[field.key] !== undefined))
    setShowForm(true)
    setDeleteId(null)
    setError('')
    setMessage('')
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = toPayload(form)
      await saveBodyMeasurement(payload, editingId)
      setMessage(editingId ? 'Medición actualizada correctamente.' : 'Medición guardada correctamente.')
      setShowForm(false)
      setEditingId(undefined)
      setLoading(true)
      setRevision((previous) => previous + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar la medición.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId || saving) return
    setSaving(true)
    setError('')
    try {
      await deleteBodyMeasurement(deleteId)
      setDeleteId(null)
      setMessage('Registro eliminado del historial. El respaldo antiguo, si existe, no se modifica.')
      setLoading(true)
      setRevision((previous) => previous + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el registro.')
    } finally {
      setSaving(false)
    }
  }

  function updateValue(key: BodyFieldKey, value: string) {
    setForm((old) => ({ ...old, values: { ...old.values, [key]: value } }))
  }

  function refresh() {
    setError('')
    setMessage('')
    setLoading(true)
    setRevision((previous) => previous + 1)
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">TU EVOLUCIÓN</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[var(--color-text-primary)]">Mi cuerpo</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Registra tus medidas a tu ritmo. Compara tendencias, no días aislados.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || saving} className={outlineButton}>
          <RefreshCw size={17} aria-hidden="true" /> Actualizar
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">{error}</div>}
      {message && <div role="status" className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)]"><Check size={18} aria-hidden="true" />{message}</div>}

      {!showForm && (
        <button type="button" onClick={startNew} className={`${primaryButton} w-full sm:w-auto`}>
          <Plus size={18} aria-hidden="true" /> Agregar medición
        </button>
      )}

      {showForm && (
        <form onSubmit={(event) => { void save(event) }} className={`${card} space-y-5`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-[var(--color-text-primary)]">{editingId ? 'Editar medición' : 'Nueva medición'}</h2>
            <button type="button" onClick={() => { setShowForm(false); setError('') }} className={outlineButton} disabled={saving} aria-label="Cerrar formulario"><X size={18} /></button>
          </div>
          <label className="block space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="flex items-center gap-2"><CalendarDays size={17} aria-hidden="true" /> Fecha</span>
            <input type="date" required value={form.date} onChange={(e) => setForm((previous) => ({ ...previous, date: e.target.value }))} className={inputClass} />
          </label>
          <fieldset className="space-y-3">
            <legend className="mb-2 flex items-center gap-2 font-bold text-[var(--color-text-primary)]"><Scale size={18} /> Medidas principales</legend>
            <div className="grid grid-cols-2 gap-3">
              {BODY_FIELDS.filter((field) => field.group === 'principal').map(({ key, label, unit }) => (
                <label key={key} className="space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
                  <span>{label} <span className="font-normal text-[var(--color-text-secondary)]">({unit})</span></span>
                  <input type="text" inputMode="decimal" value={form.values[key]} onChange={(e) => updateValue(key, e.target.value)} placeholder="Ej. 112,5" className={inputClass} />
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <button type="button" onClick={() => setShowExtra(!showExtra)} aria-expanded={showExtra} className={`${outlineButton} w-full justify-between`}>
              <span className="flex items-center gap-2"><Ruler size={18} /> Más medidas (brazos, muslos, pecho...)</span>
              {showExtra ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showExtra && (
              <fieldset className="mt-3 grid grid-cols-2 gap-3">
                <legend className="sr-only">Otras medidas corporales</legend>
                {BODY_FIELDS.filter((field) => field.group === 'adicional').map(({ key, label, unit }) => (
                  <label key={key} className="space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
                    <span>{label} <span className="font-normal text-[var(--color-text-secondary)]">({unit})</span></span>
                    <input type="text" inputMode="decimal" value={form.values[key]} onChange={(e) => updateValue(key, e.target.value)} placeholder="Opcional" className={inputClass} />
                  </label>
                ))}
              </fieldset>
            )}
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-bold text-[var(--color-text-primary)]">Medidas personalizadas</legend>
            {form.custom.map((item) => (
              <div key={item.uid} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] items-end gap-2">
                <label className="space-y-1 text-xs text-[var(--color-text-secondary)]">Nombre
                  <input aria-label="Nombre de medida personalizada" type="text" maxLength={40} value={item.name} placeholder="Glúteo alto" onChange={(event) => setForm((old) => ({ ...old, custom: old.custom.map((entry) => entry.uid === item.uid ? { ...entry, name: event.target.value } : entry) }))} className={inputClass} />
                </label>
                <label className="space-y-1 text-xs text-[var(--color-text-secondary)]">Centímetros
                  <input aria-label={`Valor de ${item.name || 'medida personalizada'} en centímetros`} type="text" inputMode="decimal" value={item.value} placeholder="cm" onChange={(event) => setForm((old) => ({ ...old, custom: old.custom.map((entry) => entry.uid === item.uid ? { ...entry, value: event.target.value } : entry) }))} className={inputClass} />
                </label>
                <button type="button" title="Quitar medida" aria-label="Quitar medida personalizada" className={outlineButton} onClick={() => setForm((old) => ({ ...old, custom: old.custom.filter((entry) => entry.uid !== item.uid) }))}><X size={18} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setForm((old) => ({ ...old, custom: [...old.custom, { uid: crypto.randomUUID(), name: '', value: '' }] }))} className={outlineButton}><Plus size={17} /> Otra medida</button>
          </fieldset>
          <label className="block space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">Notas (opcional)
            <textarea rows={2} maxLength={500} placeholder="Ej. Medición por la mañana, antes de entrenar" value={form.notes} onChange={(e) => setForm((old) => ({ ...old, notes: e.target.value }))} className={inputClass} />
          </label>
          <p className="text-xs text-[var(--color-text-secondary)]">Puedes completar solo las medidas que tomaste. Se guarda un registro por fecha. No se calcula automáticamente tu porcentaje de grasa.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className={primaryButton}><Save size={18} /> {saving ? 'Guardando...' : 'Guardar medición'}</button>
            <button type="button" disabled={saving} onClick={() => { setShowForm(false); setError('') }} className={outlineButton}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className={card}>Cargando tus medidas...</div>
      ) : records.length === 0 ? (
        <div className={`${card} space-y-3 text-center`}>
          <Activity size={32} className="mx-auto text-[var(--color-primary)]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Todavía no hay mediciones</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Registra tu primera fecha, peso o medidas. Tus datos permanecerán en este dispositivo y se incluirán en los próximos respaldos JSON.</p>
          {!showForm && <button type="button" onClick={startNew} className={primaryButton}><Plus size={18} /> Mi primera medición</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ key: 'weightKg', label: 'Peso', unit: 'kg', icon: Scale }, { key: 'waistCm', label: 'Cintura', unit: 'cm', icon: Ruler }, { key: 'hipCm', label: 'Cadera', unit: 'cm', icon: Ruler }, { key: 'abdomenCm', label: 'Abdomen', unit: 'cm', icon: Ruler }].map(({ key, label, unit, icon: Icon }) => {
              const lastWithValue = records.find((record) => record[key as BodyFieldKey] !== undefined)
              const value = lastWithValue?.[key as BodyFieldKey]
              return (
                <div key={key} className={`${card} space-y-2`}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]"><Icon size={16} aria-hidden="true" />{label}</div>
                  <p className="text-xl font-extrabold text-[var(--color-text-primary)]">{value === undefined ? '—' : <>{displayNumber(value)} <span className="text-xs font-normal">{unit}</span></>}</p>
                  {lastWithValue && <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(lastWithValue.date)}</p>}
                </div>
              )
            })}
          </div>

          <div className={`${card} space-y-4`}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"><LineChart size={20} className="text-[var(--color-primary)]" /> Gráfico de evolución</h2>
            {availableMetrics.length > 0 && <label className="block space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">Medida que deseas comparar
              <select className={inputClass} value={activeMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
                {availableMetrics.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>}
            <TrendChart records={records} selected={activeMetric} />
          </div>

          <div className={`${card} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Historial de medidas</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{records.length} {records.length === 1 ? 'registro' : 'registros'} · El más reciente: {formatDate(newest.date)}</p>
              </div>
            </div>
            {records.slice(0, visibleCount).map((record) => {
              const summaries = BODY_FIELDS.filter(({ key }) => record[key] !== undefined)
              const custom = Object.entries(record.customMeasurements ?? {})
              return (
                <article key={record.id} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]"><CalendarDays size={17} className="text-[var(--color-primary)]" /> {formatDate(record.date)}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditing(record)} className={outlineButton}><Pencil size={15} /> Editar</button>
                      <button type="button" onClick={() => setDeleteId(record.id)} className={outlineButton} aria-label={`Eliminar medición del ${formatDate(record.date)}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summaries.map(({ key, label, unit }) => <span key={key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)]">{label}: <b>{displayNumber(record[key]!)} {unit}</b></span>)}
                    {custom.map(([label, value]) => <span key={label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)]">{label}: <b>{displayNumber(value)} cm</b></span>)}
                  </div>
                  {record.notes && <p className="text-sm text-[var(--color-text-secondary)]">{record.notes}</p>}
                  {deleteId === record.id && <div className="space-y-2 rounded-xl border border-[var(--color-danger)] p-3">
                    <p className="text-sm text-[var(--color-text-primary)]">¿Eliminar este registro del historial? Se aplicará borrado lógico, sin borrar otras mediciones.</p>
                    <div className="flex gap-2">
                      <button type="button" disabled={saving} onClick={() => { void confirmDelete() }} className={primaryButton}>Confirmar eliminación</button>
                      <button type="button" disabled={saving} onClick={() => setDeleteId(null)} className={outlineButton}>Cancelar</button>
                    </div>
                  </div>}
                </article>
              )
            })}
            {visibleCount < records.length && <button type="button" className={`${outlineButton} w-full`} onClick={() => setVisibleCount((n) => n + 10)}>Mostrar más registros</button>}
          </div>
        </>
      )}
      <p className="text-xs text-[var(--color-text-secondary)]">Tus registros se guardan localmente en IndexedDB. Se incluirán en las exportaciones JSON de Gym Tracker. Las fotografías se encuentran en Mi cuerpo → Fotografías.</p>
    </section>
  )
}
