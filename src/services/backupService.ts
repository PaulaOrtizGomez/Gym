
import { DB_SCHEMA_VERSION, db } from '../db/database'

// ========================================
// CONFIGURACIÓN DEL RESPALDO
// ========================================

const FORMAT = 'gym-tracker-backup'
const FORMAT_VERSION = 1

const TABLE_NAMES = [
  'appMetadata',
  'exercises',
  'exerciseVariants',
  'routines',
  'routineDays',
  'routineExercises',
  'workouts',
  'workoutExercises',
  'setLogs',
  'bodyMeasurements',
  'progressPhotos',
  'exerciseMedia',
  'appSettings',
] as const

// ========================================
// TIPOS
// ========================================

export type BackupSummary = {
  fileName: string
  exportedAt: string
  tableCount: number
  recordCount: number
  counts: Record<string, number>
}

export type GeneratedBackup = {
  json: string
  summary: BackupSummary
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function localTimestamp(date: Date): string {
  const part = (value: number) =>
    String(value).padStart(2, '0')

  const datePart = [
    date.getFullYear(),
    part(date.getMonth() + 1),
    part(date.getDate()),
  ].join('-')

  const timePart = [
    part(date.getHours()),
    part(date.getMinutes()),
    part(date.getSeconds()),
  ].join('-')

  return `${datePart}_${timePart}`
}

// ========================================
// CONVERTIR BLOB A BASE64
// ========================================

// Se utilizan fragmentos divisibles por 3
// para concatenar Base64 correctamente.

async function blobToBase64(
  blob: Blob,
): Promise<string> {
  const bytes = new Uint8Array(
    await blob.arrayBuffer(),
  )

  const parts: string[] = []

  const chunkSize = 24 * 1024

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk = bytes.subarray(
      offset,
      offset + chunkSize,
    )

    parts.push(
      btoa(
        String.fromCharCode(...chunk),
      ),
    )
  }

  return parts.join('')
}

// ========================================
// SERIALIZAR DATOS
// ========================================

async function serializeValue(
  value: unknown,
): Promise<unknown> {
  if (value instanceof Blob) {
    return {
      __gymTrackerBlob: true,
      mimeType: value.type,
      base64: await blobToBase64(value),
    }
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map(serializeValue),
    )
  }

  if (isRecord(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(
        async ([key, item]) =>
          [
            key,
            await serializeValue(item),
          ] as const,
      ),
    )

    return Object.fromEntries(entries)
  }

  return value
}

// ========================================
// GENERAR RESPALDO
// ========================================

export async function generateGymTrackerBackup():
  Promise<GeneratedBackup> {
  const actualNames = db.tables.map(
    (table) => table.name,
  )

  const expected = new Set<string>(
    TABLE_NAMES,
  )

  // Evita crear copias incompletas
  // si cambia el esquema de la base.

  if (
    actualNames.length !== TABLE_NAMES.length ||
    actualNames.some(
      (name) => !expected.has(name),
    )
  ) {
    throw new Error(
      'La estructura de IndexedDB no coincide con las 13 tablas esperadas. No se generó un respaldo incompleto.',
    )
  }

  // ======================================
  // LEER LAS 13 TABLAS
  // ======================================

  // La lectura se realiza en una sola
  // transacción para obtener una copia
  // consistente de los registros.

  const snapshot = await db.transaction(
    'r',
    db.tables,
    async () => {
      return Promise.all(
        db.tables.map(async (table) => ({
          name: table.name,
          records: await table.toArray(),
        })),
      )
    },
  )

  // ======================================
  // PREPARAR TABLAS PARA JSON
  // ======================================

  const tables: Record<string, unknown[]> = {}

  const counts: Record<string, number> = {}

  for (const tableName of TABLE_NAMES) {
    const store = snapshot.find(
      (item) => item.name === tableName,
    )

    if (!store) {
      throw new Error(
        `Falta la tabla ${tableName} en el respaldo.`,
      )
    }

    tables[tableName] = await Promise.all(
      store.records.map(
        (record) => serializeValue(record),
      ),
    )

    counts[tableName] =
      store.records.length
  }

  // ======================================
  // METADATOS DEL RESPALDO
  // ======================================

  const now = new Date()

  const exportedAt = now.toISOString()

  const fileName =
    `gym-tracker-backup-${localTimestamp(now)}.json`

  const recordCount = Object.values(
    counts,
  ).reduce(
    (sum, count) => sum + count,
    0,
  )

  const backup = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,

    databaseName: 'GymTrackerDB',
    schemaVersion: DB_SCHEMA_VERSION,

    exportedAt,

    counts,
    tables,
  }

  // ======================================
  // RESULTADO
  // ======================================

  return {
    json: JSON.stringify(
      backup,
      null,
      2,
    ),

    summary: {
      fileName,
      exportedAt,

      tableCount: TABLE_NAMES.length,
      recordCount,

      counts,
    },
  }
}

// ========================================
// COMPROBAR ARCHIVO DE RESPALDO
// ========================================

// Esta función solo lee el JSON.
// No restaura, modifica ni elimina datos.

export async function verifyGymTrackerBackup(
  file: File,
): Promise<BackupSummary> {
  let parsed: unknown

  try {
    parsed = JSON.parse(
      await file.text(),
    ) as unknown
  } catch {
    throw new Error(
      'El archivo no es un JSON válido.',
    )
  }

  // ======================================
  // VALIDAR METADATOS
  // ======================================

  if (
    !isRecord(parsed) ||
    parsed.format !== FORMAT ||
    parsed.formatVersion !== FORMAT_VERSION ||
    parsed.databaseName !== 'GymTrackerDB' ||
    parsed.schemaVersion !== DB_SCHEMA_VERSION ||
    typeof parsed.exportedAt !== 'string' ||
    !isRecord(parsed.tables) ||
    !isRecord(parsed.counts)
  ) {
    throw new Error(
      'No corresponde a un respaldo compatible de Gym Tracker v4.',
    )
  }

  // ======================================
  // VALIDAR CANTIDAD DE TABLAS
  // ======================================

  const tableNames = Object.keys(
    parsed.tables,
  )

  const countNames = Object.keys(
    parsed.counts,
  )

  if (
    tableNames.length !== TABLE_NAMES.length ||
    countNames.length !== TABLE_NAMES.length
  ) {
    throw new Error(
      'El respaldo no contiene las 13 tablas requeridas.',
    )
  }

  // ======================================
  // VALIDAR REGISTROS
  // ======================================

  const counts: Record<string, number> = {}

  let recordCount = 0

  for (const tableName of TABLE_NAMES) {
    const rows = parsed.tables[tableName]

    const declaredCount =
      parsed.counts[tableName]

    if (
      !Array.isArray(rows) ||
      rows.length !== declaredCount ||
      rows.some(
        (row: unknown) =>
          !isRecord(row) ||
          typeof row.id !== 'string',
      )
    ) {
      throw new Error(
        `La tabla ${tableName} está incompleta o tiene datos inválidos.`,
      )
    }

    counts[tableName] = rows.length

    recordCount += rows.length
  }

  // ======================================
  // ARCHIVO COMPROBADO
  // ======================================

  return {
    fileName: file.name,

    exportedAt: parsed.exportedAt,

    tableCount: TABLE_NAMES.length,
    recordCount,

    counts,
  }
}
