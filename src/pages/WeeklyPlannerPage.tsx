import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Save } from 'lucide-react'
import CalendarDateOverrides from '../components/routines/CalendarDateOverrides'
import {
  getWeeklyPlannerData,
  localDateKey,
  saveWeeklyPlan,
  WEEK_DAYS,
  type WeeklyPlannerData,
} from '../services/weeklyPlannerService'

const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5'
const input = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]'
const secondary = 'text-[var(--color-text-secondary)]'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-button-primary)] px-4 py-2 text-sm font-bold text-[var(--color-button-text)] disabled:opacity-50'

type Assignments = Record<number, string>

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })
    .format(new Date(year, month - 1, day, 12))
}

function getWeekReference(offset: number): Date {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset * 7)
  return date
}

function makeAssignments(plan: WeeklyPlannerData): Assignments {
  return Object.fromEntries(plan.slots.map((slot) => [slot.dayOfWeek, slot.recurringIds[0] ?? '']))
}

export default function WeeklyPlannerPage() {
  const [routineId, setRoutineId] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [revision, setRevision] = useState(0)
  const [dateDirty, setDateDirty] = useState(false)
  const [plan, setPlan] = useState<WeeklyPlannerData | null>(null)
  const [draft, setDraft] = useState<Assignments>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getWeeklyPlannerData(routineId || undefined, getWeekReference(weekOffset))
        if (cancelled) return
        setPlan(result)
        setDraft(makeAssignments(result))
        setRoutineId(result.routine?.id ?? '')
        setError('')
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo leer el plan semanal.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [routineId, weekOffset, revision])

  const original = useMemo(() => plan ? makeAssignments(plan) : {}, [plan])
  const dirty = WEEK_DAYS.some((day) => (draft[day.index] ?? '') !== (original[day.index] ?? ''))
  const duplicateAssignments = plan?.slots.some((slot) => slot.dayIds.length > 1) ?? false
  const canSave = !loading && !saving && Boolean(plan?.routine) && (dirty || duplicateAssignments)
  const today = localDateKey(new Date())
  const totalAssigned = WEEK_DAYS.filter((day) => Boolean(draft[day.index])).length
  const totalCompleted = plan?.slots.reduce((total, slot) => total + slot.completedCount, 0) ?? 0

  function discardPendingChanges(): boolean {
    if (!dirty && !dateDirty) return true
    return window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')
  }

  function changeRoutine(next: string) {
    if (!discardPendingChanges()) return
    setDateDirty(false)
    setLoading(true)
    setNotice('')
    setRoutineId(next)
  }

  function moveWeek(direction: number) {
    if (!discardPendingChanges()) return
    setDateDirty(false)
    setLoading(true)
    setNotice('')
    setWeekOffset((value) => Math.max(-12, Math.min(12, value + direction)))
  }

  function assign(day: number, chosenId: string) {
    setError('')
    setNotice('')
    setDraft((previous) => {
      const next = { ...previous }
      // Mover una sesión libera automáticamente el día anterior.
      if (chosenId) {
        for (const weekday of WEEK_DAYS) {
          if (weekday.index !== day && next[weekday.index] === chosenId) {
            next[weekday.index] = ''
          }
        }
      }
      next[day] = chosenId
      return next
    })
  }

  async function save() {
    if (!plan?.routine || !canSave) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const count = await saveWeeklyPlan(plan.routine.id, draft)
      setNotice(count
        ? `Plan guardado: ${count} ${count === 1 ? 'sesión actualizada' : 'sesiones actualizadas'}.`
        : 'El plan ya estaba actualizado.')
      setLoading(true)
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el plan.')
    } finally {
      setSaving(false)
    }
  }

  function refresh() {
    if (!discardPendingChanges()) return
    setNotice('')
    setDateDirty(false)
    setLoading(true)
    setRevision((value) => value + 1)
  }

  return (
    <section className="space-y-4 text-[var(--color-text-primary)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">TU SEMANA</p>
          <h2 className="mt-1 text-2xl font-extrabold">Planificador semanal</h2>
          <p className={`mt-1 text-sm ${secondary}`}>
            Organiza tus sesiones de lunes a domingo y comprueba lo que completaste.
          </p>
        </div>
        <button type="button" disabled={loading || saving} onClick={refresh}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold ${secondary} disabled:opacity-50`}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-[var(--color-success)] p-3 text-sm text-[var(--color-success)]">{notice}</p>}
      {loading && <p className={panel} role="status">Cargando tu plan…</p>}

      {!loading && plan && (
        <>
          <div className={panel}>
            <label className="block text-sm font-semibold" htmlFor="plan-routine">Rutina que quieres organizar</label>
            <select id="plan-routine" className={`${input} mt-2`} value={plan.routine?.id ?? ''}
              disabled={saving} onChange={(event) => changeRoutine(event.target.value)}>
              {plan.routines.length === 0 && <option value="">No hay rutinas todavía</option>}
              {plan.routines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name}{routine.active ? ' (activa)' : ' (inactiva)'}
                </option>
              ))}
            </select>
            {!plan.routine && (
              <p className={`mt-3 text-sm ${secondary}`}>
                Primero crea una rutina y sus días en «Mis rutinas»; luego vuelve aquí.
              </p>
            )}
            {plan.routine && !plan.routine.active && (
              <p className="mt-3 rounded-xl bg-[var(--color-surface-soft)] p-3 text-sm">
                Esta rutina está inactiva. Puedes organizarla, pero no aparecerá en «Hoy» hasta activarla en Mis rutinas.
              </p>
            )}
          </div>

          {plan.routine && (
            <>
              <div className={`${panel} flex items-center justify-between gap-2`}>
                <button type="button" aria-label="Semana anterior" disabled={weekOffset <= -12 || saving}
                  onClick={() => moveWeek(-1)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--color-border)] disabled:opacity-40">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 text-center">
                  <p className="text-xs font-bold uppercase text-[var(--color-primary)]">{weekOffset === 0 ? 'Esta semana' : weekOffset > 0 ? 'Semana futura' : 'Semana anterior'}</p>
                  <p className="mt-1 text-sm font-bold">{formatDate(plan.weekStart)} – {formatDate(plan.weekEnd)}</p>
                </div>
                <button type="button" aria-label="Semana siguiente" disabled={weekOffset >= 12 || saving}
                  onClick={() => moveWeek(1)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--color-border)] disabled:opacity-40">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={panel}>
                  <p className="text-2xl font-extrabold tabular-nums">{totalAssigned}/7</p>
                  <p className={`text-xs ${secondary}`}>Días planificados</p>
                </div>
                <div className={panel}>
                  <p className="text-2xl font-extrabold tabular-nums">{totalCompleted}</p>
                  <p className={`text-xs ${secondary}`}>Sesiones del plan completadas esta semana</p>
                </div>
              </div>

              {duplicateAssignments && (
                <p role="alert" className="rounded-xl border border-[var(--color-warning)] p-3 text-sm">
                  Tu rutina tenía más de una sesión asignada a un mismo día. Al guardar quedará únicamente la que selecciones para cada día; las otras sesiones no se borrarán.
                </p>
              )}
              <div className="space-y-3">
                {plan.slots.map((slot) => {
                  const assignedId = draft[slot.dayOfWeek] ?? ''
                  const assigned = plan.routineDays.find((item) => item.id === assignedId)
                  const todaySlot = slot.date === today
                  return (
                    <article key={slot.dayOfWeek} className={`${panel} ${todaySlot ? 'ring-2 ring-[var(--color-primary)]' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={17} className="text-[var(--color-primary)]" aria-hidden="true" />
                          <h3 className="text-base font-extrabold">{slot.name}</h3>
                          {todaySlot && <span className="rounded-lg bg-[var(--color-surface-soft)] px-2 py-1 text-xs font-bold text-[var(--color-primary)]">Hoy</span>}
                        </div>
                        <span className={`text-xs ${secondary}`}>{formatDate(slot.date)}</span>
                      </div>
                      <label className={`mt-3 block text-xs font-semibold ${secondary}`} htmlFor={`day-${slot.dayOfWeek}`}>Sesión habitual (todas las semanas)</label>
                      <select id={`day-${slot.dayOfWeek}`} className={`${input} mt-1`} value={assignedId} disabled={saving}
                        onChange={(event) => assign(slot.dayOfWeek, event.target.value)}>
                        <option value="">Sin sesión / descanso</option>
                        {plan.routineDays.map((day) => (
                          <option key={day.id} value={day.id}>{day.name}</option>
                        ))}
                      </select>
                      <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${secondary}`}>
                        {!assigned && <span>Sin sesión habitual.</span>}
                        {slot.overrideActive && <span className="font-semibold text-[var(--color-primary)]">Fecha con cambio puntual</span>}
                        {assigned && <span>{assigned.name}</span>}
                        {!dirty && !slot.overrideActive && slot.exerciseCount > 0 && <span>· {slot.exerciseCount} ejercicios</span>}
                        {!dirty && slot.completedCount > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold text-[var(--color-success)]">
                            <CheckCircle2 size={14} /> Completado ({slot.completedCount})
                          </span>
                        )}
                        {!dirty && slot.inProgressCount > 0 && <span className="font-semibold text-[var(--color-primary)]">En curso</span>}
                        {!dirty && slot.otherCompletedCount > 0 && <span>· {slot.otherCompletedCount} otra(s) sesión(es) finalizada(s)</span>}
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className={panel}>
                <button type="button" disabled={!canSave} onClick={() => { void save() }} className={`${button} w-full`}>
                  <Save size={18} /> {saving ? 'Guardando…' : 'Guardar plan semanal'}
                </button>
                {dirty && <p className="mt-2 text-center text-xs font-semibold text-[var(--color-primary)]">Tienes cambios sin guardar.</p>}
                <p className={`mt-3 text-xs leading-relaxed ${secondary}`}>
                  Este es tu horario habitual: los cambios se aplican a todas las semanas, no a una fecha aislada.
                  «Sin sesión» deja el día libre, pero no registra un descanso independiente. Puedes realizar una sesión libre desde Entrenar.
                  Los entrenamientos ya guardados nunca se borran ni se mueven.
                </p>
              </div>
              <CalendarDateOverrides
                key={`${plan.routine.id}:${plan.weekStart}:${revision}`}
                plan={plan}
                disabled={saving || dirty || loading}
                onDirtyChange={setDateDirty}
                onSaved={(message) => {
                  setDateDirty(false)
                  setNotice(message)
                  setLoading(true)
                  setRevision((value) => value + 1)
                }}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}
