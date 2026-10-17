import { db } from '../db/database'
import { verifyGymTrackerBackup } from './backupService'
import type { BackupSummary } from './backupService'

// Comparación de solo lectura: no se agregan, actualizan ni eliminan datos.

const REFERENCES: Record<string, Record<string, string>> = {
  exerciseVariants: { exerciseId: 'exercises' },
  routineDays: { routineId: 'routines' },
  routineExercises: {
    routineDayId: 'routineDays',
    exerciseId: 'exercises',
    variantId: 'exerciseVariants',
  },
  workouts: { routineDayId: 'routineDays' },
  workoutExercises: {
    workoutId: 'workouts',
    exerciseId: 'exercises',
    variantId: 'exerciseVariants',
  },
  setLogs: { workoutExerciseId: 'workoutExercises' },
  progressPhotos: { bodyMeasurementId: 'bodyMeasurements' },
  exerciseMedia: { exerciseId: 'exercises' },
}

type BackupRow = Record<string, unknown> & { id: string }

export type BackupPreviewTable = {
  name: string
  inFile: number
  alreadyPresent: number
  missing: number
  different: number
}

export type BackupPreview = {
  summary: BackupSummary
  existing: number
  missing: number
  different: number
  possibleNameDuplicates: number
  tables: BackupPreviewTable[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// Ordena claves para comparar objetos con independencia del orden en JSON.
// Reproduce la serialización usada por backupService para los Blob.
async function canonicalValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer())
    const chunkSize = 24 * 1024 // divisible por 3
    const chunks: string[] = []

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      chunks.push(
        btoa(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))),
      )
    }

    return canonicalValue({
      __gymTrackerBlob: true,
      mimeType: value.type,
      base64: chunks.join(''),
    })
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(canonicalValue))
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {}

    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) {
        normalized[key] = await canonicalValue(value[key])
      }
    }

    return normalized
  }

  return value
}

function validateFileRelationships(tables: Record<string, BackupRow[]>) {
  const idsByTable: Record<string, Set<string>> = {}

  for (const [tableName, rows] of Object.entries(tables)) {
    const ids = new Set<string>()

    for (const row of rows) {
      if (ids.has(row.id)) {
        throw new Error(
          `El respaldo tiene un identificador repetido en ${tableName}.`,
        )
      }
      ids.add(row.id)
    }

    idsByTable[tableName] = ids
  }

  for (const [tableName, foreignKeys] of Object.entries(REFERENCES)) {
    for (const row of tables[tableName] ?? []) {
      for (const [field, referencedTable] of Object.entries(foreignKeys)) {
        const reference = row[field]
        if (reference === undefined || reference === null || reference === '') {
          continue
        }

        if (
          typeof reference !== 'string' ||
          !idsByTable[referencedTable]?.has(reference)
        ) {
          throw new Error(
            `El respaldo contiene una referencia inválida en ${tableName}.${field}.`,
          )
        }
      }
    }
  }
}

export async function previewGymTrackerBackup(file: File): Promise<BackupPreview> {
  // Reutiliza la verificación del formato y de las 13 tablas existente.
  const summary = await verifyGymTrackerBackup(file)
  const parsed = JSON.parse(await file.text()) as {
    tables: Record<string, unknown[]>
  }

  const incoming: Record<string, BackupRow[]> = {}

  for (const name of Object.keys(summary.counts)) {
    const rows = parsed.tables[name]

    if (!Array.isArray(rows)) {
      throw new Error(`No se pudo leer la tabla ${name}.`)
    }

    incoming[name] = rows as BackupRow[]
  }

  validateFileRelationships(incoming)

  // Una sola transacción de lectura ofrece una instantánea consistente.
  // Ningún await que procese fotos o Base64 ocurre dentro de la transacción.
  const current = await db.transaction('r', db.tables, async () => {
    return Promise.all(
      db.tables.map(async (table) => ({
        name: table.name,
        rows: await table.toArray(),
      })),
    )
  })

  const tables: BackupPreviewTable[] = []
  let existing = 0
  let missing = 0
  let different = 0
  let possibleNameDuplicates = 0

  for (const name of Object.keys(summary.counts)) {
    const rows = incoming[name]
    const stored = current.find((table) => table.name === name)?.rows ?? []
    const byId = new Map<string, unknown>()
    const namesByOtherId = new Map<string, Set<string>>()

    for (const row of stored) {
      if (!isRecord(row) || typeof row.id !== 'string') continue
      byId.set(row.id, row)

      if (
        (name === 'exercises' || name === 'routines') &&
        typeof row.name === 'string'
      ) {
        const key = normalizeName(row.name)
        const ids = namesByOtherId.get(key) ?? new Set<string>()
        ids.add(row.id)
        namesByOtherId.set(key, ids)
      }
    }

    let tableExisting = 0
    let tableMissing = 0
    let tableDifferent = 0

    for (const row of rows) {
      if (!byId.has(row.id)) {
        tableMissing += 1

        if (
          typeof row.name === 'string' &&
          namesByOtherId.has(normalizeName(row.name))
        ) {
          possibleNameDuplicates += 1
        }
        continue
      }

      tableExisting += 1

      const [saved, fromFile] = await Promise.all([
        canonicalValue(byId.get(row.id)),
        canonicalValue(row),
      ])

      if (JSON.stringify(saved) !== JSON.stringify(fromFile)) {
        tableDifferent += 1
      }
    }

    existing += tableExisting
    missing += tableMissing
    different += tableDifferent

    tables.push({
      name,
      inFile: rows.length,
      alreadyPresent: tableExisting,
      missing: tableMissing,
      different: tableDifferent,
    })
  }

  return {
    summary,
    existing,
    missing,
    different,
    possibleNameDuplicates,
    tables,
  }
}
