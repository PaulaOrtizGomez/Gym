import { db } from '../db/database'
import { previewGymTrackerBackup } from './backupPreviewService'
import type { BackupPreview } from './backupPreviewService'

/**
 * Restauración NO destructiva de Gym Tracker v4.
 * - Inserta únicamente ID inexistentes.
 * - No actualiza, borra ni reemplaza datos locales.
 * - Si detecta conflictos por nombre, detiene toda la operación.
 * - Restaura Blob de fotos y multimedia antes de iniciar la transacción.
 * - Utiliza una sola transacción RW de Dexie para insertar o revertir todo.
 */

export type RestoreResult = {
  inserted: number
  preserved: number
  byTable: { name: string; inserted: number }[]
}

type BackupRow = Record<string, unknown> & { id: string }
type BackupPayload = { tables: Record<string, BackupRow[]> }

const MAX_BACKUP_FILE_BYTES = 250 * 1024 * 1024
const MAX_SINGLE_BLOB_BYTES = 100 * 1024 * 1024
const MAX_TOTAL_DECODED_BLOB_BYTES = 240 * 1024 * 1024

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizedName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function fail(message: string): never {
  throw new Error(message)
}

function decodedBlob(source: Record<string, unknown>, budget: { bytes: number }): Blob {
  const mimeType = source.mimeType
  const base64 = source.base64
  if (source.__gymTrackerBlob !== true || typeof mimeType !== 'string' ||
      mimeType.length > 150 || typeof base64 !== 'string' ||
      base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return fail('El respaldo contiene una fotografía o archivo multimedia inválido.')
  }

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const bytes = base64.length / 4 * 3 - padding
  if (bytes > MAX_SINGLE_BLOB_BYTES || budget.bytes + bytes > MAX_TOTAL_DECODED_BLOB_BYTES) {
    return fail('Los archivos del respaldo son demasiado grandes para una restauración segura.')
  }
  budget.bytes += bytes

  try {
    // Atob procesa fragmentos pequeños para evitar cadenas binarias enormes.
    const chunks: Uint8Array<ArrayBuffer>[] = []
    for (let i = 0; i < base64.length; i += 32768) {
      const binary = atob(base64.slice(i, i + 32768))
      const chunk = new Uint8Array(binary.length)
      for (let j = 0; j < binary.length; j += 1) chunk[j] = binary.charCodeAt(j)
      chunks.push(chunk)
    }
    const blob = new Blob(chunks, { type: mimeType })
    if (blob.size !== bytes) return fail('Un archivo multimedia tiene un tamaño incoherente.')
    return blob
  } catch {
    return fail('No se pudo reconstruir un archivo multimedia del respaldo.')
  }
}

function reviveValue(value: unknown, budget: { bytes: number }): unknown {
  if (Array.isArray(value)) return value.map((item) => reviveValue(item, budget))
  if (!record(value)) return value

  if (Object.hasOwn(value, '__gymTrackerBlob')) return decodedBlob(value, budget)

  const result: Record<string, unknown> = Object.create(null)
  for (const [key, content] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return fail('El respaldo contiene propiedades no permitidas.')
    }
    result[key] = reviveValue(content, budget)
  }
  return result
}

function getMissingForDecoding(
  tables: Record<string, BackupRow[]>,
  existingIds: Record<string, Set<string>>,
): Record<string, BackupRow[]> {
  const candidates: Record<string, BackupRow[]> = {}
  for (const [name, rows] of Object.entries(tables)) {
    const known = existingIds[name]
    if (!known) return fail(`Tabla desconocida: ${name}.`)
    candidates[name] = rows.filter((row) => !known.has(row.id))
  }
  return candidates
}

function checkPhotoRows(name: string, rows: BackupRow[]) {
  if (name !== 'progressPhotos' && name !== 'exerciseMedia') return
  for (const row of rows) {
    if (!(row.blob instanceof Blob) || row.blob.size === 0 ||
        typeof row.fileSize !== 'number' || row.fileSize !== row.blob.size ||
        typeof row.mimeType !== 'string' || row.mimeType !== row.blob.type) {
      return fail(`El respaldo contiene un archivo incompleto en ${name}.`)
    }
  }
}

/**
 * Conserva todo lo existente, incluso los registros con contenido diferente.
 * Si falla la importación de cualquier tabla, IndexedDB revierte la transacción.
 */
export async function restoreMissingGymTrackerData(file: File): Promise<RestoreResult> {
  if (file.size === 0 || file.size > MAX_BACKUP_FILE_BYTES) {
    return fail('Selecciona un respaldo JSON de hasta 250 MB.')
  }

  // Verifica formato, 13 tablas, IDs únicos y relaciones (siempre de solo lectura).
  const preview: BackupPreview = await previewGymTrackerBackup(file)
  if (preview.possibleNameDuplicates !== 0) {
    return fail('Hay nombres potencialmente duplicados. No se restauró nada; revisa la comparación.')
  }
  if (preview.missing === 0) {
    return { inserted: 0, preserved: preview.existing, byTable: preview.tables.map((t) => ({ name: t.name, inserted: 0 })) }
  }

  const parsed: unknown = JSON.parse(await file.text())
  if (!record(parsed) || !record(parsed.tables)) return fail('La estructura del archivo no es válida.')
  const payload = parsed as BackupPayload
  const tableNames = db.tables.map((table) => table.name)

  if (Object.keys(payload.tables).length !== tableNames.length ||
      tableNames.some((name) => !Array.isArray(payload.tables[name]))) {
    return fail('El respaldo no contiene exactamente las 13 tablas requeridas.')
  }

  // Prepara blobs ANTES de abrir la transacción: dentro solo se usa IndexedDB.
  const currentIds = await db.transaction('r', db.tables, async () => {
    const pairs = await Promise.all(db.tables.map(async (table) => {
      const keys = await table.toCollection().primaryKeys()
      return [table.name, new Set(keys.map(String))] as const
    }))
    return Object.fromEntries(pairs) as Record<string, Set<string>>
  })
  const firstMissing = getMissingForDecoding(payload.tables, currentIds)
  const budget = { bytes: 0 }
  const revived: Record<string, Map<string, BackupRow>> = {}

  for (const name of tableNames) {
    const decodedRows = firstMissing[name].map((row) => reviveValue(row, budget) as BackupRow)
    checkPhotoRows(name, decodedRows)
    revived[name] = new Map(decodedRows.map((row) => [row.id, row]))
  }

  // No realiza I/O ni decodificación fuera de Dexie mientras la transacción esté activa.
  return db.transaction('rw', db.tables, async () => {
    const existingByTable: Record<string, BackupRow[]> = {}
    for (const table of db.tables) {
      existingByTable[table.name] = await table.toArray() as BackupRow[]
    }

    const idsByTable: Record<string, Set<string>> = {}
    const missingByTable: Record<string, BackupRow[]> = {}

    for (const name of tableNames) {
      const existing = existingByTable[name]
      const knownIds = new Set(existing.map((row) => row.id))
      idsByTable[name] = knownIds
      const missing = payload.tables[name].filter((row) => !knownIds.has(row.id))
      for (const row of missing) {
        if (!revived[name].has(row.id)) {
          return fail('Los datos cambiaron durante la preparación. Vuelve a seleccionar el respaldo.')
        }
      }
      missingByTable[name] = missing.map((row) => revived[name].get(row.id)!)
    }

    // La comparación original incluye duplicados por nombre. Repetimos esta
    // validación DENTRO de la transacción, pues otra pestaña pudo crear registros.
    for (const name of ['exercises', 'routines']) {
      // Una rutina eliminada lógicamente debe conservarse en el histórico,
      // pero no impedir recuperar otra rutina activa con el mismo nombre.
      const activeName = (row: BackupRow) =>
        typeof row.name === 'string' && !row.deletedAt
      const occupied = new Set(
        existingByTable[name]
          .filter(activeName)
          .map((row) => normalizedName(row.name as string)),
      )
      for (const row of missingByTable[name]) {
        if (typeof row.name !== 'string' || !row.name.trim()) {
          return fail(`El respaldo tiene un nombre inválido en ${name}.`)
        }
        if (!activeName(row)) continue
        const normalized = normalizedName(row.name)
        if (occupied.has(normalized)) {
          return fail(`Existe un nombre duplicado en ${name}. No se restauró nada.`)
        }
        occupied.add(normalized)
      }
    }

    // Todas las referencias del archivo fueron validadas por preview. Como
    // importamos todos los IDs faltantes juntos, se conservan las relaciones.
    let inserted = 0
    const byTable: RestoreResult['byTable'] = []
    for (const table of db.tables) {
      const rows = missingByTable[table.name]
      if (rows.length > 0) await table.bulkAdd(rows)
      inserted += rows.length
      byTable.push({ name: table.name, inserted: rows.length })
    }

    const preserved = tableNames.reduce(
      (sum, name) => sum + payload.tables[name].length - missingByTable[name].length,
      0,
    )
    return { inserted, preserved, byTable }
  })
}
