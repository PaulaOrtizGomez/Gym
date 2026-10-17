import { db } from '../db/database'
import type { ProgressPhoto, ProgressPhotoPose } from '../types/domain'

export const PHOTO_POSES: ReadonlyArray<{ value: ProgressPhotoPose; label: string }> = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Perfil' },
  { value: 'back', label: 'Espalda' },
  { value: 'custom', label: 'Otra posición' },
]

export const MAX_INPUT_PHOTO_BYTES = 12 * 1024 * 1024
const MAX_SAVED_PHOTO_BYTES = 2.5 * 1024 * 1024
const LONGEST_SIDE_PX = 1600
const VALID_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type NewProgressPhoto = {
  date: string
  pose: ProgressPhotoPose
  note?: string
  file: File
}

function validLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('No se pudo comprimir la fotografía.')),
      mimeType,
      quality,
    )
  })
}

/**
 * Redimensiona la imagen antes de guardarla. Canvas elimina los metadatos EXIF
 * y evita almacenar fotografías de tamaño original innecesariamente grandes.
 */
async function optimizePhoto(file: File): Promise<{ blob: Blob; mimeType: string; fileName: string }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No fue posible abrir la imagen. Prueba con una foto JPG, PNG o WebP válida.')
  }

  try {
    const { width, height } = bitmap
    if (!width || !height) throw new Error('La imagen no tiene dimensiones válidas.')
    const ratio = Math.min(1, LONGEST_SIDE_PX / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no permite procesar la fotografía.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.84, 0.7, 0.55]) {
      const candidate = await canvasToBlob(canvas, 'image/webp', quality)
      // El navegador puede recurrir a PNG si no puede codificar WebP.
      if (candidate.size <= MAX_SAVED_PHOTO_BYTES) {
        const isWebp = candidate.type === 'image/webp'
        const extension = isWebp ? '.webp' : candidate.type === 'image/png' ? '.png' : '.jpg'
        const base = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'progreso'
        return { blob: candidate, mimeType: candidate.type || 'image/webp', fileName: `${base}${extension}` }
      }
    }
    throw new Error('No se pudo reducir la fotografía a menos de 2,5 MB. Prueba con otra imagen.')
  } finally {
    bitmap.close()
  }
}

export async function getProgressPhotos(): Promise<ProgressPhoto[]> {
  const photos = await db.progressPhotos.toArray()
  return photos
    .filter((photo) => !photo.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order || b.createdAt.localeCompare(a.createdAt))
}

export async function addProgressPhoto(input: NewProgressPhoto): Promise<void> {
  if (!validLocalDate(input.date)) throw new Error('Selecciona una fecha válida.')
  if (!PHOTO_POSES.some((pose) => pose.value === input.pose)) throw new Error('Selecciona una posición válida.')
  if ((input.note?.length ?? 0) > 300) throw new Error('La nota admite hasta 300 caracteres.')
  if (!VALID_MIME_TYPES.has(input.file.type)) throw new Error('Usa una fotografía JPG, PNG o WebP.')
  if (input.file.size === 0 || input.file.size > MAX_INPUT_PHOTO_BYTES) {
    throw new Error('La foto debe pesar más de 0 bytes y como máximo 12 MB.')
  }

  const processed = await optimizePhoto(input.file)
  const now = new Date().toISOString()
  try {
    await db.transaction('rw', db.progressPhotos, db.bodyMeasurements, async () => {
      const sameDayPhotos = await db.progressPhotos.where('date').equals(input.date).toArray()
      const sameDayMeasurements = await db.bodyMeasurements.where('date').equals(input.date).toArray()
      const measurement = sameDayMeasurements.find((row) => !row.deletedAt)
      const order = sameDayPhotos.reduce((max, photo) => Math.max(max, photo.order), 0) + 1
      await db.progressPhotos.add({
        id: crypto.randomUUID(),
        date: input.date,
        pose: input.pose,
        bodyMeasurementId: measurement?.id,
        blob: processed.blob,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        fileSize: processed.blob.size,
        order,
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      })
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('No queda espacio suficiente en el almacenamiento del navegador. Haz un respaldo y libera espacio antes de intentar de nuevo.', { cause: error })
    }
    throw error
  }
}

/** Borrado permanente: también retira el Blob y libera el espacio ocupado. */
export async function permanentlyDeleteProgressPhoto(id: string): Promise<void> {
  await db.transaction('rw', db.progressPhotos, async () => {
    const photo = await db.progressPhotos.get(id)
    if (!photo || photo.deletedAt) throw new Error('La fotografía ya no existe.')
    await db.progressPhotos.delete(id)
  })
}
