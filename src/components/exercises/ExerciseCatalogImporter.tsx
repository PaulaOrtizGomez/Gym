
import { useState } from 'react'
import { BookOpen, Download } from 'lucide-react'

import {
  EXERCISE_CATALOG_TOTAL,
  importExerciseCatalog,
} from '../../services/exerciseCatalogService'

import type {
  CatalogImportResult,
} from '../../services/exerciseCatalogService'

type ExerciseCatalogImporterProps = {
  onImported: () => void
}

export default function ExerciseCatalogImporter({
  onImported,
}: ExerciseCatalogImporterProps) {
  const [busy, setBusy] = useState(false)

  const [result, setResult] =
    useState<CatalogImportResult | null>(null)

  const [error, setError] = useState('')

  async function handleImport() {
    if (busy) return

    setBusy(true)
    setError('')
    setResult(null)

    try {
      const summary = await importExerciseCatalog()

      setResult(summary)
      onImported()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo importar el catálogo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[#F3D6E2] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <BookOpen
          size={22}
          className="mt-1 shrink-0 text-[#E30B5D]"
          aria-hidden="true"
        />

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#2A2228]">
            Biblioteca de ejercicios
          </h2>

          <p className="mt-1 text-sm text-[#766A74]">
            Añade {EXERCISE_CATALOG_TOTAL} ejercicios de gimnasio,
            bancos, poleas, pesas libres, bandas, colchoneta,
            cardio, movilidad y elongación.
          </p>

          <p className="mt-1 text-xs text-[#766A74]">
            No borra ni modifica tus ejercicios actuales.
            Se guarda en este dispositivo y funciona sin internet.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F3A4BD] px-4 py-3 text-sm font-bold text-[#2A2228] hover:bg-[#EC8EAC] disabled:cursor-wait disabled:opacity-60"
      >
        <Download size={18} aria-hidden="true" />

        {busy
          ? 'Importando ejercicios…'
          : 'Agregar biblioteca completa'}
      </button>

      {result && (
        <p
          role="status"
          className="rounded-xl bg-[#F2FBF5] p-3 text-sm text-[#256345]"
        >
          Catálogo procesado: {result.added} ejercicios nuevos;{' '}
          {result.skipped} ya existían y se respetaron.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  )
}
