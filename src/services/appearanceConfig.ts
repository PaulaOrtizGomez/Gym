import type { AppSettings, FontFamilyPreference } from '../types/domain'

export const APPEARANCE_DEFAULTS: AppSettings = {
  id: 'appearance',
  themeMode: 'light',
  accentColor: '#F3A4BD',
  fontFamily: 'nunito',
  fontScale: 'normal',
  updatedAt: new Date(0).toISOString(),
}

export const ACCENT_PRESETS = [
  { label: 'Rosa pastel', color: '#F3A4BD' },
  { label: 'Lavanda', color: '#B8A0F4' },
  { label: 'Menta', color: '#92D8BE' },
  { label: 'Celeste', color: '#95CDF4' },
  { label: 'Durazno', color: '#F4BA9A' },
  { label: 'Frambuesa', color: '#EC80B5' },
] as const

export const FONT_STACKS: Record<FontFamilyPreference, string> = {
  // Tipografías nativas: funcionan incluso sin internet.
  nunito: '"Arial Rounded MT Bold", "Trebuchet MS", Verdana, sans-serif',
  modern: '"Century Gothic", "Trebuchet MS", Arial, sans-serif',
  system: '"Segoe UI", system-ui, sans-serif',
}

export function safeAppearance(value: AppSettings | undefined): AppSettings {
  if (!value) return APPEARANCE_DEFAULTS
  return {
    id: 'appearance',
    themeMode: ['light', 'dark', 'system'].includes(value.themeMode)
      ? value.themeMode : 'light',
    accentColor: /^#[0-9a-fA-F]{6}$/.test(value.accentColor)
      ? value.accentColor : '#F3A4BD',
    fontFamily: ['nunito', 'modern', 'system'].includes(value.fontFamily)
      ? value.fontFamily : 'nunito',
    fontScale: ['small', 'normal', 'large'].includes(value.fontScale)
      ? value.fontScale : 'normal',
    updatedAt: value.updatedAt || new Date().toISOString(),
  }
}

