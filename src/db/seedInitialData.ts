import { db } from './database'
import { createExercise } from '../services/exerciseService'

export async function seedInitialData() {
  const exerciseCount = await db.exercises.count()

  if (exerciseCount > 0) {
    return
  }

  await createExercise({
    name: 'Hip thrust',
    category: 'Glúteos',
    movementPattern: 'Extensión de cadera',
    equipment: 'Máquina / barra',
    favorite: true,
  })
}