import { Check, Monitor, Moon, Paintbrush, Sun, Type } from 'lucide-react'
import type { AppSettings, FontFamilyPreference, FontScale, ThemeMode } from '../../types/domain'
import { ACCENT_PRESETS, FONT_STACKS } from '../../services/appearanceConfig'

type SettingsPatch = Partial<Pick<AppSettings,
  'themeMode' | 'accentColor' | 'fontFamily' | 'fontScale'
>>

type Props = {
  settings: AppSettings
  saving: boolean
  error: string
  onChange: (change: SettingsPatch) => void
}

const modes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'system', label: 'Automático', icon: Monitor },
]

const fonts: { id: FontFamilyPreference; label: string; description: string }[] = [
  { id: 'nunito', label: 'Redondeada', description: 'Suave y amigable' },
  { id: 'modern', label: 'Geométrica', description: 'Limpia y delicada' },
  { id: 'system', label: 'Sistema', description: 'Clásica y legible' },
]

const sizes: { id: FontScale; label: string; note: string }[] = [
  { id: 'small', label: 'Pequeña', note: '15 px base' },
  { id: 'normal', label: 'Normal', note: '16 px base' },
  { id: 'large', label: 'Grande', note: '18 px base' },
]

export default function AppearanceSettings({ settings, saving, error, onChange }: Props) {
  return (
    <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Paintbrush className="mt-1 shrink-0 text-[var(--color-primary)]" size={22} aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Apariencia</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Personaliza los colores y las letras de Gym Tracker. Los cambios se guardan en este dispositivo.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">Modo de visualización</legend>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, label, icon: Icon }) => {
            const selected = settings.themeMode === id
            return (
              <button
                key={id}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => onChange({ themeMode: id })}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-sm font-semibold transition ${selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}
              >
                <Icon size={21} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Automático utiliza el modo claro u oscuro configurado en tu dispositivo.
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold">Color principal</legend>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map(({ label, color }) => {
            const selected = settings.accentColor.toLowerCase() === color.toLowerCase()
            return (
              <button
                key={color}
                type="button"
                disabled={saving}
                title={label}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => onChange({ accentColor: color })}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--color-border)] shadow-sm focus-visible:outline-2"
                style={{ backgroundColor: color, outlineOffset: 3, outlineColor: 'var(--color-primary)' }}
              >
                {selected && <Check size={21} strokeWidth={3} className="text-[#211C24]" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <span>Elegir otro color</span>
          <input
            type="color"
            aria-label="Elegir color personalizado"
            disabled={saving}
            value={settings.accentColor}
            onChange={event => onChange({ accentColor: event.target.value })}
            className="h-11 w-16 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
          />
          <span className="text-xs font-normal text-[var(--color-text-secondary)]">{settings.accentColor.toUpperCase()}</span>
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Type size={17} aria-hidden="true" /> Tipo de letra
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {fonts.map(font => {
            const selected = settings.fontFamily === font.id
            return (
              <button
                key={font.id}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => onChange({ fontFamily: font.id })}
                className={`min-h-20 rounded-xl border p-3 text-left transition ${selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}
              >
                <span className="block text-base font-bold" style={{ fontFamily: FONT_STACKS[font.id] }}>{font.label}</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{font.description}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">Tamaño de letra</legend>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map(size => {
            const selected = settings.fontScale === size.id
            return (
              <button
                key={size.id}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => onChange({ fontScale: size.id })}
                className={`min-h-16 rounded-xl border p-2 text-center transition ${selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}
              >
                <span className="block text-sm font-bold">{size.label}</span>
                <span className="block text-xs text-[var(--color-text-secondary)]">{size.note}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
        <p className="text-sm font-bold">Vista previa</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Hoy toca entrenar: Hip thrust · 3 series de 12 repeticiones.
        </p>
        <div className="mt-3 rounded-lg bg-[var(--color-button-primary)] px-3 py-2 text-center text-sm font-bold text-[var(--color-button-text)]">
          Guardar mi entrenamiento
        </div>
      </div>

      {saving && <p role="status" className="text-xs text-[var(--color-text-secondary)]">Guardando apariencia…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-100 p-2 text-sm text-red-900">{error}</p>}
      <p className="text-xs text-[var(--color-text-secondary)]">
        Las tipografías utilizan fuentes del sistema para conservar el funcionamiento sin internet.
      </p>
    </section>
  )
}
