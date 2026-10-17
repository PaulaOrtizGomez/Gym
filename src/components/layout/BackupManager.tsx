import { useState } from 'react'
import { Download, FileCheck2, RotateCcw, ShieldCheck } from 'lucide-react'

import { generateGymTrackerBackup } from '../../services/backupService'
import type { BackupSummary } from '../../services/backupService'
import { previewGymTrackerBackup } from '../../services/backupPreviewService'
import type { BackupPreview } from '../../services/backupPreviewService'
import { restoreMissingGymTrackerData } from '../../services/backupRestoreService'
import type { RestoreResult } from '../../services/backupRestoreService'

const buttonClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-button-primary)] px-4 py-3 text-sm font-bold text-[var(--color-button-text)] hover:bg-[var(--color-button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50'

const TABLE_LABELS: Record<string, string> = {
  appMetadata: 'Metadatos',
  exercises: 'Ejercicios',
  exerciseVariants: 'Variantes',
  routines: 'Rutinas',
  routineDays: 'Días de rutina',
  routineExercises: 'Ejercicios programados',
  workouts: 'Entrenamientos',
  workoutExercises: 'Ejercicios realizados',
  setLogs: 'Series',
  bodyMeasurements: 'Medidas corporales',
  progressPhotos: 'Fotos de progreso',
  exerciseMedia: 'Multimedia de ejercicios',
  appSettings: 'Configuraciones',
}

export default function BackupManager() {
  const [exporting, setExporting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [exported, setExported] = useState<BackupSummary | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [error, setError] = useState('')

  const busy = exporting || checking || restoring
  const canRestore = !busy && selectedFile !== null && preview !== null &&
    preview.missing > 0 && preview.possibleNameDuplicates === 0 &&
    acknowledged && confirmation.trim() === 'RESTAURAR'

  async function handleExport() {
    if (busy) return
    setExporting(true)
    setError('')
    setExported(null)
    try {
      const { json, summary } = await generateGymTrackerBackup()
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = summary.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30000)
      setExported(summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo preparar el respaldo.')
    } finally {
      setExporting(false)
    }
  }

  async function handlePreview(file: File) {
    if (busy) return
    setChecking(true)
    setSelectedFile(null)
    setPreview(null)
    setRestoreResult(null)
    setAcknowledged(false)
    setConfirmation('')
    setError('')
    try {
      const result = await previewGymTrackerBackup(file)
      setPreview(result)
      setSelectedFile(file)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo analizar el respaldo.')
    } finally {
      setChecking(false)
    }
  }

  async function handleRestore() {
    if (!canRestore || !selectedFile) return

    // El segundo consentimiento es intencional: esta acción escribe en IndexedDB.
    const approved = window.confirm(
      `¿Confirmas que deseas recuperar únicamente los ${preview?.missing ?? 0} registros faltantes?\n\n` +
      'Ningún registro existente se reemplazará ni borrará. Si ocurre un error, la transacción se revierte.',
    )
    if (!approved) return

    setRestoring(true)
    setError('')
    setRestoreResult(null)
    try {
      const result = await restoreMissingGymTrackerData(selectedFile)
      setRestoreResult(result)
      setAcknowledged(false)
      setConfirmation('')
      // Si falla el nuevo análisis, la restauración ya se confirmó: no ocultar el éxito.
      try {
        setPreview(await previewGymTrackerBackup(selectedFile))
      } catch {
        setPreview(null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La restauración no pudo completarse.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck size={23} className="mt-1 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Respaldo de mis datos</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Guarda tus rutinas, entrenamientos, series, medidas, fotografías y preferencias.
          </p>
        </div>
      </div>

      <button type="button" className={buttonClass} disabled={busy} onClick={() => void handleExport()}>
        <Download size={18} aria-hidden="true" />
        {exporting ? 'Preparando archivo…' : 'Descargar respaldo JSON actual'}
      </button>

      {exported && (
        <div role="status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)]">
          <p className="font-semibold">Descarga solicitada al navegador.</p>
          <p className="mt-1 break-all">{exported.fileName}</p>
          <p>{exported.tableCount} tablas · {exported.recordCount} registros.</p>
          <p className="mt-1 text-xs">Confirma que el archivo se haya guardado fuera del navegador.</p>
        </div>
      )}

      <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
        <label htmlFor="gym-backup-preview" className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
          <FileCheck2 size={18} className="text-[var(--color-primary)]" aria-hidden="true" />
          Comprobar y previsualizar un respaldo
        </label>
        <input
          id="gym-backup-preview"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void handlePreview(file)
          }}
          className="block min-h-11 w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-2 file:font-semibold file:text-[var(--color-text-primary)]"
        />
        <p className="text-xs text-[var(--color-text-secondary)]">
          La comparación es de solo lectura. Los registros existentes se conservan aunque sean distintos a los del archivo.
        </p>
      </div>

      {checking && <p role="status" className="text-sm text-[var(--color-text-primary)]">Analizando respaldo…</p>}
      {restoring && <p role="status" className="text-sm font-semibold text-[var(--color-text-primary)]">Restaurando registros faltantes… No cierres esta pestaña.</p>}

      {preview && (
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)]">
          <div>
            <p className="font-bold">Respaldo compatible · Comparación completada</p>
            <p>{preview.summary.tableCount} tablas · {preview.summary.recordCount} registros en el archivo.</p>
            <p className="mt-1 break-all text-xs">{selectedFile?.name ?? preview.summary.fileName}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'ID existentes', count: preview.existing },
              { label: 'ID faltantes', count: preview.missing },
              { label: 'ID diferentes', count: preview.different },
              { label: 'Posibles nombres duplicados', count: preview.possibleNameDuplicates },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <p className="text-xl font-extrabold">{item.count}</p>
                <p className="text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <summary className="cursor-pointer font-semibold">Ver comparación por tabla</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="py-2 pr-2">Tabla</th>
                    <th className="py-2 pr-2">Archivo</th>
                    <th className="py-2 pr-2">Existen</th>
                    <th className="py-2 pr-2">Faltan</th>
                    <th className="py-2">Distintos</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.tables.map((table) => (
                    <tr key={table.name} className="border-b border-[var(--color-border)]">
                      <td className="py-2 pr-2">{TABLE_LABELS[table.name] ?? table.name}</td>
                      <td className="py-2 pr-2">{table.inFile}</td>
                      <td className="py-2 pr-2">{table.alreadyPresent}</td>
                      <td className="py-2 pr-2">{table.missing}</td>
                      <td className="py-2">{table.different}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={18} className="text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="font-bold">Restaurar solo lo que falta</h3>
            </div>
            {preview.missing === 0 ? (
              <p className="text-sm font-semibold">
                No hay registros faltantes. No es necesario restaurar este archivo y no se modificará nada.
              </p>
            ) : preview.possibleNameDuplicates > 0 ? (
              <p role="alert" className="text-sm">
                Restauración bloqueada: existen posibles duplicados por nombre. Revisa esos conflictos antes de importar.
              </p>
            ) : (
              <>
                <p>
                  Se podrán recuperar <strong>{preview.missing} registros faltantes</strong>.
                  Los {preview.existing} ID existentes y los {preview.different} con contenido distinto se conservarán tal como están.
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Antes de continuar, descarga un respaldo JSON nuevo de tus datos actuales y guárdalo en un lugar seguro.
                  La restauración se ejecuta en una única transacción: un fallo cancela todos los cambios de esta operación.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={acknowledged} disabled={busy} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
                  <span>He guardado un respaldo actual y entiendo que solo se agregarán ID faltantes, sin sobrescribir datos.</span>
                </label>
                <div className="space-y-1">
                  <label htmlFor="gym-confirm-restore" className="block text-xs font-semibold">
                    Escribe RESTAURAR para confirmar
                  </label>
                  <input
                    id="gym-confirm-restore"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="RESTAURAR"
                    className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <button type="button" className={buttonClass} disabled={!canRestore} onClick={() => void handleRestore()}>
                  <RotateCcw size={18} aria-hidden="true" />
                  {restoring ? 'Restaurando…' : `Restaurar ${preview.missing} registros faltantes`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {restoreResult && (
        <div role="status" className="space-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)]">
          <p className="font-bold">Restauración completada.</p>
          <p>{restoreResult.inserted} registros agregados · {restoreResult.preserved} conservados sin cambios.</p>
          <p>Actualiza Chrome para que las demás pantallas vuelvan a cargar los datos restaurados.</p>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <p className="text-xs text-[var(--color-text-secondary)]">
        El respaldo JSON puede contener fotografías personales. No lo compartas públicamente.
        La restauración de este paso no reemplaza ni elimina registros; un conflicto por ID siempre se conserva localmente.
      </p>
    </section>
  )
}
