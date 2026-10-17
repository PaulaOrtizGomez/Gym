import { db } from './database'

import {
  createExercise,
  deleteExercise,
  getDeletedExercises,
  getExerciseById,
  getExercises,
  restoreExercise,
  updateExercise,
} from '../services/exerciseService'

export async function runExerciseCrudSelfTest() {
  let testExerciseId: string | undefined

  try {
    console.log(
      '🧪 Iniciando prueba CRUD de Exercise...',
    )

    /*
     * CREATE
     */
    const createdExercise =
      await createExercise({
        name: 'Ejercicio CRUD temporal',
        category: 'Otro',
        movementPattern:
          'Prueba inicial',
        equipment:
          'Equipo de prueba',
        notes:
          'Registro temporal para validar CRUD.',
        favorite: false,
      })

    testExerciseId =
      createdExercise.id

    console.log(
      '✅ CREATE correcto:',
      createdExercise,
    )

    /*
     * READ BY ID
     */
    const readExercise =
      await getExerciseById(
        createdExercise.id,
      )

    if (!readExercise) {
      throw new Error(
        'READ falló: no se encontró el ejercicio creado.',
      )
    }

    if (
      readExercise.name !==
      'Ejercicio CRUD temporal'
    ) {
      throw new Error(
        'READ falló: el nombre leído no coincide.',
      )
    }

    console.log(
      '✅ READ por ID correcto:',
      readExercise,
    )

    /*
     * READ LIST
     */
    const activeExercisesBeforeUpdate =
      await getExercises()

    const existsInActiveList =
      activeExercisesBeforeUpdate.some(
        (exercise) =>
          exercise.id ===
          createdExercise.id,
      )

    if (!existsInActiveList) {
      throw new Error(
        'READ LIST falló: el ejercicio no aparece entre los activos.',
      )
    }

    console.log(
      '✅ READ lista de activos correcto.',
    )

    /*
     * UPDATE
     */
    const updatedExercise =
      await updateExercise(
        createdExercise.id,
        {
          name:
            'Ejercicio CRUD editado',

          movementPattern:
            'Prueba modificada',

          equipment:
            'Equipo editado',

          notes:
            'El ejercicio fue editado correctamente.',

          favorite: true,
        },
      )

    if (
      updatedExercise.name !==
      'Ejercicio CRUD editado'
    ) {
      throw new Error(
        'UPDATE falló: el nombre no se actualizó.',
      )
    }

    if (
      updatedExercise.favorite !==
      true
    ) {
      throw new Error(
        'UPDATE falló: favorite no se actualizó.',
      )
    }

    console.log(
      '✅ UPDATE correcto:',
      updatedExercise,
    )

    /*
     * DELETE LÓGICO
     */
    await deleteExercise(
      createdExercise.id,
    )

    const deletedExercise =
      await getExerciseById(
        createdExercise.id,
      )

    if (
      !deletedExercise?.deletedAt
    ) {
      throw new Error(
        'DELETE falló: deletedAt no fue asignado.',
      )
    }

    console.log(
      '✅ DELETE lógico correcto:',
      deletedExercise,
    )

    /*
     * COMPROBAR QUE YA NO APARECE
     * ENTRE LOS EJERCICIOS ACTIVOS
     */
    const activeExercisesAfterDelete =
      await getExercises()

    const stillActive =
      activeExercisesAfterDelete.some(
        (exercise) =>
          exercise.id ===
          createdExercise.id,
      )

    if (stillActive) {
      throw new Error(
        'DELETE falló: el ejercicio eliminado sigue apareciendo como activo.',
      )
    }

    console.log(
      '✅ El ejercicio eliminado ya no aparece entre los activos.',
    )

    /*
     * COMPROBAR PAPELERA
     */
    const deletedExercises =
      await getDeletedExercises()

    const existsInDeletedList =
      deletedExercises.some(
        (exercise) =>
          exercise.id ===
          createdExercise.id,
      )

    if (!existsInDeletedList) {
      throw new Error(
        'DELETE falló: el ejercicio no aparece entre los eliminados.',
      )
    }

    console.log(
      '✅ READ de eliminados correcto.',
    )

    /*
     * RESTORE
     */
    const restoredExercise =
      await restoreExercise(
        createdExercise.id,
      )

    if (
      restoredExercise.deletedAt
    ) {
      throw new Error(
        'RESTORE falló: deletedAt sigue presente.',
      )
    }

    console.log(
      '✅ RESTORE correcto:',
      restoredExercise,
    )

    /*
     * COMPROBAR QUE VOLVIÓ
     * A LOS ACTIVOS
     */
    const activeExercisesAfterRestore =
      await getExercises()

    const restoredIsActive =
      activeExercisesAfterRestore.some(
        (exercise) =>
          exercise.id ===
          createdExercise.id,
      )

    if (!restoredIsActive) {
      throw new Error(
        'RESTORE falló: el ejercicio restaurado no volvió a los activos.',
      )
    }

    console.log(
      '✅ El ejercicio restaurado volvió correctamente a la biblioteca activa.',
    )

    console.log(
      '🎉 CRUD DE EXERCISE COMPLETO: CREATE, READ, UPDATE, DELETE Y RESTORE FUNCIONAN.',
    )
  } catch (error) {
    console.error(
      '❌ Falló la prueba CRUD de Exercise:',
      error,
    )

    throw error
  } finally {
    /*
     * LIMPIEZA EXCLUSIVA DE LA PRUEBA.
     *
     * Esto NO representa el comportamiento
     * normal del botón Eliminar de la app.
     *
     * El CRUD real utiliza borrado lógico.
     * Aquí hacemos borrado físico solamente
     * para no dejar basura de testing.
     */
    if (testExerciseId) {
      await db.exercises.delete(
        testExerciseId,
      )

      console.log(
        '🧹 Ejercicio temporal de prueba eliminado físicamente.',
      )
    }
  }
}