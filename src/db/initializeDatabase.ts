import {
  DB_SCHEMA_VERSION,
  db,
} from './database'

const CURRENT_APP_VERSION = '0.0.0'

export async function initializeDatabase() {
  const existingMetadata = await db.appMetadata.get('app')

  const now = new Date().toISOString()

  if (!existingMetadata) {
    await db.appMetadata.add({
      id: 'app',
      schemaVersion: DB_SCHEMA_VERSION,
      appVersion: CURRENT_APP_VERSION,
      createdAt: now,
      updatedAt: now,
    })

    return
  }

  if (
    existingMetadata.schemaVersion !== DB_SCHEMA_VERSION ||
    existingMetadata.appVersion !== CURRENT_APP_VERSION
  ) {
    await db.appMetadata.update('app', {
      schemaVersion: DB_SCHEMA_VERSION,
      appVersion: CURRENT_APP_VERSION,
      updatedAt: now,
    })
  }
}