import { useState } from 'react'
import { CalendarClock, RotateCcw, Save } from 'lucide-react'
import { saveCalendarExceptions } from '../../services/calendarExceptionService'
import type { WeeklyPlannerData } from '../../services/weeklyPlannerService'

const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const select = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]'
const textSecondary = 'text-[var(--color-text-secondary)]'

function draftFromPlan(plan: WeeklyPlannerData): Record<string, string> {
  return Object.fromEntries(plan.slots.map((slot) => [slot.date, slot.dayIds[0] ?? '']))
}

function readableDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })
    .format(new Date(year, month - 1, day, 12))
}

type Props = {
  plan: WeeklyPlannerData
  disabled: boolean
  onSaved: (message: string) => void
  onDirtyChange: (dirty: boolean) => void
}

/** Cambios de UNA semana específica, sin editar RoutineDay.dayOfWeek. */
export default function CalendarDateOverrides({ plan, disabled, onSaved, onDirtyChange }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>(() => draftFromPlan(plan))
  const [resetRequested, setResetRequested] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const changed = plan.slots.some((slot) => (draft[slot.date] ?? '') !== (slot.dayIds[0] ?? ''))
  const dirty = changed || resetRequested
  const storedOverrides = plan.slots.filter((slot) => slot.overrideActive).length

  function updateDraft(next: Record<string, string>, reset: boolean) {
    setDraft(next)
    setResetRequested(reset)
    const isDirty = reset || plan.slots.some((slot) => (next[slot.date] ?? '') !== (slot.dayIds[0] ?? ''))
    onDirtyChange(isDirty)
  }

  function changeDay(date: string, dayId: string) {
    const next = { ...draft }
    if (dayId) {
      // Mover la sesión libera su fecha anterior dentro de esta semana solamente.
      for (const slot of plan.slots) {
        if (slot.date !== date && next[slot.date] === dayId) next[slot.date] = ''
      }
    }
    next[date] = dayId
    updateDraft(next, false)
    setNotice('')
    setError('')
  }

  function restoreHabitual() {
    const next = Object.fromEntries(plan.slots.map((slot) => [slot.date, slot.recurringIds[0] ?? '']))
    updateDraft(next, true)
    setNotice('Los cambios de esta semana se quitarán al guardar. Los demás días no se modificarán.')
    setError('')
  }

  async function save() {
    if (!plan.routine || disabled || !dirty || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const changes = plan.slots.map((slot) => {
        const chosen = draft[slot.date] ?? ''
        const recurring = slot.recurringIds[0] ?? ''
        return {
          date: slot.date,
          // undefined revierte al horario recurrente; null significa descanso puntual.
          dayId: chosen === recurring ? undefined : (chosen || null),
        }
      })
      const count = await saveCalendarExceptions(plan.routine.id, changes)
      onDirtyChange(false)
      onSaved(count > 0
        ? `${count} ${count === 1 ? 'fecha ajustada' : 'fechas ajustadas'} solo para esta semana.`
        : 'Esta semana ya tenía esos ajustes.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar los cambios puntuales.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`${panel} space-y-4`} aria-label="Cambios de fechas concretas">
      <div className="flex items-start gap-3">
        <CalendarClock size={23} className="mt-1 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-extrabold">Cambiar solo esta semana</h3>
          <p className={`mt-1 text-sm leading-relaxed ${textSecondary}`}>
            Estos cambios se aplican exclusivamente del {readableDate(plan.weekStart)} al {readableDate(plan.weekEnd)}.
            Tu horario habitual de lunes a domingo no cambia.
          </p>
        </div>
      </div>

      {disabled && <p className="rounded-xl bg-[var(--color-surface-soft)] p-3 text-sm">Primero guarda o descarta los cambios del horario habitual para editar fechas concretas.</p>}
      {storedOverrides > 0 && <p className="rounded-xl bg-[var(--color-surface-soft)] p-3 text-sm">Hay {storedOverrides} {storedOverrides === 1 ? 'fecha personalizada' : 'fechas personalizadas'} en esta semana.</p>}
      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {notice && <p role="status" className={`text-sm ${textSecondary}`}>{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {plan.slots.map((slot) => {
          const chosen = draft[slot.date] ?? ''
          const recurring = slot.recurringIds[0] ?? ''
          const altered = chosen !== recurring
          return (
            <div key={slot.date} className="rounded-xl border border-[var(--color-border)] p-3">
              <label htmlFor={`exception-${slot.date}`} className="block text-sm font-bold">
                {slot.name} · {readableDate(slot.date)}
              </label>
              <select id={`exception-${slot.date}`} value={chosen} disabled={saving || disabled}
                onChange={(event) => changeDay(slot.date, event.target.value)} className={`${select} mt-2`}>
                <option value="">Descanso / sin sesión</option>
                {plan.routineDays.map((day) => <option key={day.id} value={day.id}>{day.name}</option>)}
              </select>
              <p className={`mt-2 text-xs ${altered ? 'font-semibold text-[var(--color-primary)]' : textSecondary}`}>
                {altered ? 'Cambio solo para esta fecha' : slot.overrideActive ? 'Excepción guardada' : 'Según el horario habitual'}
              </p>
            </div>
          )
        })}
      </div>

      <p className={`text-xs leading-relaxed ${textSecondary}`}>
        Si seleccionas en otra fecha una sesión que ya estaba programada esta semana, se libera automáticamente su fecha anterior.
        La sesión desplazada de la fecha de destino no se borra de tus rutinas.
        Los entrenamientos ya registrados no se modifican.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={restoreHabitual} disabled={saving || disabled || (storedOverrides === 0 && !dirty)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-40">
          <RotateCcw size={17} /> Recuperar horario de esta semana
        </button>
        <button type="button" onClick={() => { void save() }} disabled={saving || disabled || !dirty}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-button-primary)] px-4 text-sm font-bold text-[var(--color-button-text)] disabled:opacity-40">
          <Save size={17} /> {saving ? 'Guardando…' : 'Guardar cambios de estas fechas'}
        </button>
      </div>
      {dirty && <p className="text-xs font-bold text-[var(--color-primary)]">Hay cambios puntuales sin guardar.</p>}
    </section>
  )
}
