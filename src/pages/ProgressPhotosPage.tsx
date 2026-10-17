import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  CalendarDays,
  Camera,
  Check,
  Images,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'

import type { ProgressPhoto, ProgressPhotoPose } from '../types/domain'
import {
  addProgressPhoto,
  getProgressPhotos,
  MAX_INPUT_PHOTO_BYTES,
  permanentlyDeleteProgressPhoto,
  PHOTO_POSES,
} from '../services/progressPhotoService'

const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const field = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]'
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-button-primary)] px-4 py-2 font-bold text-[var(--color-button-text)] disabled:opacity-50'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-50'

function todayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
}

function poseLabel(pose: ProgressPhotoPose) {
  return PHOTO_POSES.find((item) => item.value === pose)?.label ?? pose
}

// Un URL temporal por imagen montada; siempre se revoca al desmontar o cambiar.
function PhotoImage({ photo, className }: { photo: ProgressPhoto; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const nextUrl = URL.createObjectURL(photo.blob)
    const frame = window.requestAnimationFrame(() => setUrl(nextUrl))
    return () => {
      window.cancelAnimationFrame(frame)
      URL.revokeObjectURL(nextUrl)
    }
  }, [photo.blob])

  if (!url) return <div className={`${className ?? ''} flex items-center justify-center bg-[var(--color-surface-soft)] text-xs text-[var(--color-text-secondary)]`}>Cargando foto…</div>
  return <img src={url} alt={`Foto ${poseLabel(photo.pose).toLowerCase()} del ${formatDate(photo.date)}`} className={className} loading="lazy" />
}

export default function ProgressPhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(todayLocal)
  const [pose, setPose] = useState<ProgressPhotoPose>('front')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [visibleCount, setVisibleCount] = useState(8)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [comparePose, setComparePose] = useState<ProgressPhotoPose | 'auto'>('auto')
  const [beforeId, setBeforeId] = useState('')
  const [afterId, setAfterId] = useState('')

  useEffect(() => {
    let cancelled = false
    getProgressPhotos()
      .then((rows) => {
        if (!cancelled) setPhotos(rows)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las fotos.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [revision])

  const selectedComparePose: ProgressPhotoPose = comparePose === 'auto'
    ? (PHOTO_POSES.find(({ value }) => photos.filter((photo) => photo.pose === value).length >= 2)?.value
      ?? PHOTO_POSES.find(({ value }) => photos.some((photo) => photo.pose === value))?.value
      ?? 'front')
    : comparePose

  const candidates = useMemo(() => photos
    .filter((photo) => photo.pose === selectedComparePose)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order), [photos, selectedComparePose])
  const first = candidates.find((photo) => photo.id === beforeId) ?? candidates[0]
  const second = candidates.find((photo) => photo.id === afterId) ?? candidates[candidates.length - 1]

  function refresh() {
    if (loading || saving) return
    setLoading(true)
    setError('')
    setRevision((n) => n + 1)
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    // Permite volver a seleccionar el mismo archivo tras un error.
    event.target.value = ''
    setFile(selected)
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!file) {
      setError('Selecciona una fotografía para guardarla.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await addProgressPhoto({ date, pose, note, file })
      setMessage('Foto guardada correctamente en este dispositivo.')
      setShowForm(false)
      setFile(null)
      setNote('')
      setLoading(true)
      setRevision((n) => n + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la fotografía.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await permanentlyDeleteProgressPhoto(deleteId)
      setDeleteId(null)
      setBeforeId('')
      setAfterId('')
      setMessage('Foto eliminada permanentemente del dispositivo. Las medidas y entrenamientos no cambiaron.')
      setLoading(true)
      setRevision((n) => n + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la fotografía.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">TU EVOLUCIÓN</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[var(--color-text-primary)]">Fotos de progreso</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Misma posición, luz y distancia para comparar con más claridad.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || saving} className={secondary}><RefreshCw size={17} /> Actualizar</button>
      </header>

      <aside className={`${card} flex gap-3`}>
        <ShieldCheck className="mt-0.5 shrink-0 text-[var(--color-primary)]" size={22} aria-hidden="true" />
        <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
          <p className="font-bold text-[var(--color-text-primary)]">Fotografías privadas, guardadas en tu dispositivo</p>
          <p>Las imágenes se reducen antes de almacenarlas en IndexedDB y funcionan sin conexión. No se suben a un servidor desde esta función.</p>
          <p>Si exportas un respaldo JSON que incluye fotos, ese archivo también contendrá imágenes privadas: guárdalo en un lugar seguro y no lo compartas.</p>
        </div>
      </aside>

      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)]"><Check size={18} aria-hidden="true" />{message}</p>}

      {!showForm && <button type="button" onClick={() => { setShowForm(true); setError(''); setMessage(''); setDate(todayLocal()) }} className={primary}><Plus size={18} /> Agregar fotografía</button>}
      {showForm && <form onSubmit={(event) => { void save(event) }} className={`${card} space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[var(--color-text-primary)]">Nueva fotografía</h2>
          <button type="button" disabled={saving} className={secondary} onClick={() => { setShowForm(false); setFile(null) }} aria-label="Cerrar formulario"><X size={18}/></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="flex items-center gap-2"><CalendarDays size={17}/> Fecha</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={field}/>
          </label>
          <label className="space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
            <span>Posición</span>
            <select value={pose} onChange={(e) => setPose(e.target.value as ProgressPhotoPose)} className={field}>
              {PHOTO_POSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <span className="flex items-center gap-2"><Camera size={18}/> Elegir fotografía</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} className="block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm text-[var(--color-text-primary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-2 file:font-semibold file:text-[var(--color-text-primary)]" />
          <span className="block text-xs font-normal text-[var(--color-text-secondary)]">JPG, PNG o WebP · máximo {(MAX_INPUT_PHOTO_BYTES / 1024 / 1024).toFixed(0)} MB. Se comprime automáticamente antes de guardar.</span>
          {file && <span className="block text-xs font-semibold">Archivo: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>}
        </label>
        <label className="block space-y-1 text-sm font-semibold text-[var(--color-text-primary)]">
          <span>Nota (opcional)</span>
          <textarea maxLength={300} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Por ejemplo: misma luz, después de entrenar…" className={field}/>
        </label>
        <button type="submit" disabled={saving || !file} className={`${primary} w-full sm:w-auto`}><Save size={18}/>{saving ? 'Comprimiendo y guardando…' : 'Guardar fotografía'}</button>
      </form>}

      {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Cargando tus fotografías…</p> : photos.length === 0 ? (
        <div className={`${card} flex flex-col items-center gap-3 py-9 text-center`}>
          <Images size={34} className="text-[var(--color-primary)]" aria-hidden="true"/>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Todavía no tienes fotografías</h2>
          <p className="max-w-md text-sm text-[var(--color-text-secondary)]">Agrega una foto de frente, perfil o espalda. Puedes registrar varias por fecha y consultar su evolución más adelante.</p>
        </div>
      ) : <>
        <div className={`${card} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-extrabold text-[var(--color-text-primary)]">Comparar fotografías</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Selecciona dos momentos de la misma posición.</p></div>
            <label className="min-w-[150px] space-y-1 text-xs font-semibold text-[var(--color-text-primary)]"><span>Posición</span>
              <select value={selectedComparePose} onChange={(e) => { setComparePose(e.target.value as ProgressPhotoPose); setBeforeId(''); setAfterId('') }} className={field}>
                {PHOTO_POSES.map(({ value, label }) => <option key={value} value={value}>{label} ({photos.filter((photo) => photo.pose === value).length})</option>)}
              </select>
            </label>
          </div>
          {candidates.length < 2 ? <p className="rounded-xl bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-secondary)]">Necesitas al menos dos fotografías de {poseLabel(selectedComparePose).toLowerCase()} para comparar fechas.</p> : <>
            <div className="grid grid-cols-2 gap-3">
              {([['Antes', first, beforeId, setBeforeId], ['Después', second, afterId, setAfterId]] as const).map(([label, photo, selected, change]) => (
                <div key={label} className="min-w-0 space-y-2">
                  <label className="block space-y-1 text-sm font-bold text-[var(--color-text-primary)]"><span>{label}</span>
                    <select value={candidates.some((item) => item.id === selected) ? selected : photo.id} onChange={(e) => change(e.target.value)} className={`${field} text-xs`}>
                      {candidates.map((item) => <option key={item.id} value={item.id}>{formatDate(item.date)} · foto {item.order}</option>)}
                    </select>
                  </label>
                  <div className="aspect-[3/4] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                    <PhotoImage key={photo.id} photo={photo} className="h-full w-full object-contain" />
                  </div>
                  <p className="text-center text-xs text-[var(--color-text-secondary)]">{formatDate(photo.date)}</p>
                </div>
              ))}
            </div>
            {first.id === second.id && <p className="text-xs text-[var(--color-text-secondary)]">Selecciona dos fotografías distintas para ver un antes y después real.</p>}
          </>}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-[var(--color-text-primary)]">Galería personal</h2>
            <span className="text-sm text-[var(--color-text-secondary)]">{photos.length} {photos.length === 1 ? 'fotografía' : 'fotografías'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.slice(0, visibleCount).map((photo) => <article key={photo.id} className={`${card} space-y-3`}>
              <div className="aspect-[3/4] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                <PhotoImage photo={photo} className="h-full w-full object-contain"/>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold text-[var(--color-text-primary)]">{poseLabel(photo.pose)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(photo.date)} · {(photo.fileSize / 1024).toFixed(0)} KB</p></div>
                <button type="button" disabled={saving} aria-label={`Eliminar fotografía del ${formatDate(photo.date)}`} className={secondary} onClick={() => setDeleteId(photo.id)}><Trash2 size={17}/></button>
              </div>
              {photo.note && <p className="text-sm text-[var(--color-text-secondary)]">{photo.note}</p>}
              {deleteId === photo.id && <div className="space-y-2 rounded-xl border border-[var(--color-danger)] p-3">
                <p className="text-sm text-[var(--color-text-primary)]">¿Eliminar esta foto permanentemente del dispositivo? No se puede deshacer. Las fotos de respaldos anteriores permanecerán en esos archivos.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={saving} className={primary} onClick={() => { void confirmDelete() }}>Sí, eliminar foto</button>
                  <button type="button" disabled={saving} className={secondary} onClick={() => setDeleteId(null)}>Cancelar</button>
                </div>
              </div>}
            </article>)}
          </div>
          {visibleCount < photos.length && <button type="button" className={`${secondary} w-full`} onClick={() => setVisibleCount((n) => n + 8)}>Mostrar más fotografías</button>}
        </div>
      </>}

      <p className="text-xs text-[var(--color-text-secondary)]">Las fotografías de esta función permanecen en el almacenamiento local del navegador (IndexedDB). Si borras los datos del navegador, podrías perderlas; descarga respaldos periódicos y verifica que incluyan tus fotos.</p>
    </section>
  )
}
