import { db } from '../db/database'
import type { BodyMeasurement } from '../types/domain'

export type BodyMeasurementInput = Omit<BodyMeasurement,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

export const BODY_FIELDS = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', group: 'principal' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm', group: 'principal' },
  { key: 'hipCm', label: 'Cadera', unit: 'cm', group: 'principal' },
  { key: 'abdomenCm', label: 'Abdomen', unit: 'cm', group: 'principal' },
  { key: 'chestCm', label: 'Pecho', unit: 'cm', group: 'adicional' },
  { key: 'thighLeftCm', label: 'Muslo izquierdo', unit: 'cm', group: 'adicional' },
  { key: 'thighRightCm', label: 'Muslo derecho', unit: 'cm', group: 'adicional' },
  { key: 'armLeftCm', label: 'Brazo izquierdo', unit: 'cm', group: 'adicional' },
  { key: 'armRightCm', label: 'Brazo derecho', unit: 'cm', group: 'adicional' },
  { key: 'calfLeftCm', label: 'Pantorrilla izquierda', unit: 'cm', group: 'adicional' },
  { key: 'calfRightCm', label: 'Pantorrilla derecha', unit: 'cm', group: 'adicional' },
  { key: 'neckCm', label: 'Cuello', unit: 'cm', group: 'adicional' },
  { key: 'bodyFatPct', label: 'Grasa corporal (estimada)', unit: '%', group: 'adicional' },
] as const

export type BodyFieldKey = (typeof BODY_FIELDS)[number]['key']

function validLocalDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
}

function validatePayload(input: BodyMeasurementInput) {
  if (!validLocalDate(input.date)) throw new Error('Selecciona una fecha válida.')
  if ((input.notes?.length ?? 0) > 500) throw new Error('La nota admite un máximo de 500 caracteres.')

  let count = 0
  for (const { key, label } of BODY_FIELDS) {
    const value = input[key]
    if (value === undefined) continue
    count += 1
    const maximum = key === 'weightKg' ? 700 : key === 'bodyFatPct' ? 100 : 500
    if (!Number.isFinite(value) || value <= 0 || value > maximum) {
      throw new Error(`${label}: escribe un número mayor que 0 y no superior a ${maximum}.`)
    }
  }

  const names = new Set<string>()
  for (const [name, value] of Object.entries(input.customMeasurements ?? {})) {
    const normalized = name.trim().toLocaleLowerCase('es-CL')
    if (!normalized || name.length > 40) {
      throw new Error('Los nombres de las medidas personalizadas deben tener de 1 a 40 caracteres.')
    }
    if (names.has(normalized)) throw new Error('Hay nombres de medidas personalizadas repetidos.')
    names.add(normalized)
    if (!Number.isFinite(value) || value <= 0 || value > 500) {
      throw new Error(`Medida ${name}: escribe un valor entre 0 y 500 cm.`)
    }
    count += 1
  }

  if (count === 0) throw new Error('Registra al menos un valor de peso o una medida corporal.')
}

export async function getBodyMeasurements(): Promise<BodyMeasurement[]> {
  const rows = await db.bodyMeasurements.toArray()
  return rows
    .filter((row) => !row.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveBodyMeasurement(input: BodyMeasurementInput, editingId?: string): Promise<void> {
  validatePayload(input)
  await db.transaction('rw', db.bodyMeasurements, async () => {
    const sameDate = await db.bodyMeasurements.where('date').equals(input.date).toArray()
    if (sameDate.some((record) => !record.deletedAt && record.id !== editingId)) {
      throw new Error('Ya tienes un registro para esa fecha. Puedes editarlo desde el historial.')
    }

    const now = new Date().toISOString()
    if (editingId) {
      const existing = await db.bodyMeasurements.get(editingId)
      if (!existing || existing.deletedAt) throw new Error('El registro ya no existe.')
      await db.bodyMeasurements.put({ ...existing, ...input, updatedAt: now })
    } else {
      await db.bodyMeasurements.add({
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })
    }
  })
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  await db.transaction('rw', db.bodyMeasurements, async () => {
    const record = await db.bodyMeasurements.get(id)
    if (!record || record.deletedAt) throw new Error('El registro ya no existe.')
    const now = new Date().toISOString()
    await db.bodyMeasurements.update(id, { deletedAt: now, updatedAt: now })
  })
}
