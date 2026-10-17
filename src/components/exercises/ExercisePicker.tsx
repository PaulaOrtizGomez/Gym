import { useId, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'

import type { Exercise } from '../../types/domain'

type ExerciseGroup =
  | 'Todos'
  | 'Favoritos'
  | 'Piernas'
  | 'Glúteos'
  | 'Cuádriceps'
  | 'Femoral'
  | 'Pantorrilla'
  | 'Espalda'
  | 'Pecho'
  | 'Hombros'
  | 'Brazos'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Cardio'
  | 'Movilidad'
  | 'Elongación'
  | 'Otros'

type EquipmentGroup =
  | 'Todos'
  | 'Máquinas'
  | 'Poleas'
  | 'Mancuernas'
  | 'Barras'
  | 'Bancos'
  | 'Bandas'
  | 'Colchonetas'
  | 'Peso corporal'

const GROUPS: ExerciseGroup[] = [
  'Todos',
  'Favoritos',
  'Piernas',
  'Glúteos',
  'Cuádriceps',
  'Femoral',
  'Pantorrilla',
  'Espalda',
  'Pecho',
  'Hombros',
  'Brazos',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
  'Movilidad',
  'Elongación',
  'Otros',
]

const EQUIPMENT: EquipmentGroup[] = [
  'Todos',
  'Máquinas',
  'Poleas',
  'Mancuernas',
  'Barras',
  'Bancos',
  'Bandas',
  'Colchonetas',
  'Peso corporal',
]

const PAGE_SIZE = 35

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
}

function groupMatches(exercise: Exercise, group: ExerciseGroup) {
  const movement = normalize(exercise.movementPattern ?? '')
  const name = normalize(exercise.name)

  switch (group) {
    case 'Todos':
      return true
    case 'Favoritos':
      return exercise.favorite
    case 'Piernas':
      return (
        ['Glúteos', 'Cuádriceps', 'Femoral', 'Pantorrilla'].includes(exercise.category) ||
        (exercise.category === 'Otro' && (
          movement.startsWith('aduccion de cadera') ||
          name.startsWith('aduccion de cadera') ||
          name.startsWith('copenhagen plank')
        ))
      )
    case 'Brazos':
      return exercise.category === 'Bíceps' || exercise.category === 'Tríceps'
    case 'Movilidad':
      return movement.includes('movilidad')
    case 'Elongación':
      return movement.includes('elongacion')
    case 'Otros':
      return exercise.category === 'Otro'
    default:
      return exercise.category === group
  }
}

function equipmentMatches(exercise: Exercise, group: EquipmentGroup) {
  if (group === 'Todos') return true

  const equipment = normalize(exercise.equipment ?? '')

  switch (group) {
    case 'Máquinas':
      return /(maquina|prensa|caminadora|eliptica|escaladora|bicicleta|ergometro)/.test(equipment)
    case 'Poleas':
      return equipment.includes('polea')
    case 'Mancuernas':
      return equipment.includes('mancuerna')
    case 'Barras':
      return equipment.includes('barra') || equipment.includes('smith')
    case 'Bancos':
      return equipment.includes('banco')
    case 'Bandas':
      return equipment.includes('banda')
    case 'Colchonetas':
      return equipment.includes('colchoneta')
    case 'Peso corporal':
      return equipment.includes('peso corporal') || equipment.includes('sin equipamiento')
  }
}

type ExercisePickerProps = {
  library: Exercise[]
  value: string
  onChange: (exerciseId: string) => void
  disabled?: boolean
}

export default function ExercisePicker({
  library,
  value,
  onChange,
  disabled = false,
}: ExercisePickerProps) {
  const searchId = useId()
  const equipmentId = useId()
  const [group, setGroup] = useState<ExerciseGroup>('Todos')
  const [equipment, setEquipment] = useState<EquipmentGroup>('Todos')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const selected = library.find((exercise) => exercise.id === value)

  const results = useMemo(() => {
    const query = normalize(search)

    return library
      .filter((exercise) => !exercise.deletedAt)
      .filter((exercise) => groupMatches(exercise, group))
      .filter((exercise) => equipmentMatches(exercise, equipment))
      .filter((exercise) => {
        if (!query) return true
        return normalize([
          exercise.name,
          exercise.category,
          exercise.equipment ?? '',
          exercise.movementPattern ?? '',
        ].join(' ')).includes(query)
      })
      .sort((left, right) => {
        if (left.favorite !== right.favorite) return left.favorite ? -1 : 1
        return left.name.localeCompare(right.name, 'es')
      })
  }, [library, group, equipment, search])

  if (disabled) {
    return (
      <div className="rounded-xl border border-[#EFDCE5] bg-white p-3 text-sm">
        <span className="font-semibold text-[#2A2228]">
          {selected?.name ?? 'Ejercicio no disponible'}
        </span>
        <p className="mt-1 text-xs text-[#766A74]">
          El ejercicio no se cambia desde la edición de series y descansos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={searchId} className="mb-1 block text-sm font-semibold text-[#2A2228]">
          Buscar ejercicio
        </label>
        <div className="relative">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-[#A3275A]" />
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder="Nombre, músculo o equipamiento…"
            className="min-h-12 w-full rounded-xl border border-[#EFDCE5] bg-white py-2 pl-10 pr-3 text-base text-[#2A2228] outline-none focus:border-[#E30B5D]"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#766A74]">Filtrar por grupo muscular</p>
        <div role="group" aria-label="Grupo muscular" className="flex flex-wrap gap-2">
          {GROUPS.map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={group === entry}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                group === entry
                  ? 'border-[#E30B5D] bg-[#F3A4BD] text-[#2A2228]'
                  : 'border-[#F3D6E2] bg-white text-[#A3275A] hover:bg-[#FFF0F6]'
              }`}
              onClick={() => {
                setGroup(entry)
                setLimit(PAGE_SIZE)
              }}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={equipmentId} className="mb-1 block text-xs font-semibold text-[#766A74]">
          Equipamiento
        </label>
        <select
          id={equipmentId}
          value={equipment}
          onChange={(event) => {
            setEquipment(event.target.value as EquipmentGroup)
            setLimit(PAGE_SIZE)
          }}
          className="min-h-11 w-full rounded-xl border border-[#EFDCE5] bg-white px-3 text-sm text-[#2A2228]"
        >
          {EQUIPMENT.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'Todos' ? 'Cualquier equipamiento' : entry}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="flex items-start gap-2 rounded-xl border border-[#E30B5D] bg-[#FFF0F6] p-3 text-sm">
          <Check size={18} className="mt-0.5 shrink-0 text-[#A3275A]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-[#A3275A]">Ejercicio seleccionado</span>
            <strong className="break-words text-[#2A2228]">{selected.name}</strong>
            <span className="block text-xs text-[#766A74]">{selected.category}</span>
          </div>
          <button
            type="button"
            aria-label="Quitar selección"
            className="rounded-lg p-1 text-[#A3275A] hover:bg-white"
            onClick={() => onChange('')}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="space-y-2">
        <p aria-live="polite" className="text-xs font-medium text-[#766A74]">
          {results.length} {results.length === 1 ? 'ejercicio encontrado' : 'ejercicios encontrados'}
        </p>

        <div role="group" aria-label="Resultados de ejercicios" className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-[#F3D6E2] bg-white p-2">
          {results.slice(0, limit).map((exercise) => (
            <button
              type="button"
              key={exercise.id}
              aria-pressed={value === exercise.id}
              className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-sm ${
                value === exercise.id
                  ? 'border-[#E30B5D] bg-[#FFF0F6]'
                  : 'border-transparent hover:border-[#F3D6E2] hover:bg-[#FFF9FC]'
              }`}
              onClick={() => onChange(exercise.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold text-[#2A2228]">{exercise.name}</span>
                <span className="block text-xs text-[#766A74]">
                  {exercise.category} · {exercise.equipment || 'Sin equipamiento especificado'}
                  {exercise.favorite && ' · ★ Favorito'}
                </span>
              </span>
              {value === exercise.id && (
                <Check size={18} className="shrink-0 text-[#E30B5D]" aria-hidden="true" />
              )}
            </button>
          ))}

          {results.length === 0 && (
            <p className="p-3 text-sm text-[#766A74]">
              No hay ejercicios para este filtro. Prueba otra categoría o búsqueda.
            </p>
          )}
        </div>

        {results.length > limit && (
          <button
            type="button"
            className="min-h-10 w-full rounded-xl border border-[#F3D6E2] bg-white px-3 text-sm font-semibold text-[#A3275A]"
            onClick={() => setLimit((previous) => previous + PAGE_SIZE)}
          >
            Mostrar más ({results.length - limit} restantes)
          </button>
        )}
      </div>
    </div>
  )
}
