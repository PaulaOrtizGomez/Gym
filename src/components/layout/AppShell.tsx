
import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import BottomNavigation from './BottomNavigation'
import DesktopNavigation from './DesktopNavigation'

import type { AppTab } from './navigation'
import type { AppSettings } from '../../types/domain'
import { db } from '../../db/database'
import {
  APPEARANCE_DEFAULTS,
  safeAppearance,
} from '../../services/appearanceConfig'

// Las pantallas se cargan cuando se visitan por primera vez.
// Las declaraciones permanecen fuera de AppShell para
// conservar su identidad entre renderizaciones.

const RoutineManager = lazy(
  () => import('../routines/RoutineManager'),
)

const WeeklyPlannerPage = lazy(
  () => import('../../pages/WeeklyPlannerPage'),
)

const ExerciseManager = lazy(
  () => import('../exercises/ExerciseManager'),
)

const ExerciseCatalogImporter = lazy(
  () => import('../exercises/ExerciseCatalogImporter'),
)

const BackupManager = lazy(
  () => import('./BackupManager'),
)

const AppearanceSettings = lazy(
  () => import('./AppearanceSettings'),
)

const WorkoutPage = lazy(
  () => import('../../pages/WorkoutPage'),
)

const WorkoutHistoryPage = lazy(
  () => import('../../pages/WorkoutHistoryPage'),
)

const StrengthProgressPage = lazy(
  () => import('../../pages/StrengthProgressPage'),
)

const TrainingStatisticsPage = lazy(
  () => import('../../pages/TrainingStatisticsPage'),
)

const BodyProgressPage = lazy(
  () => import('../../pages/BodyProgressPage'),
)

const ProgressPhotosPage = lazy(
  () => import('../../pages/ProgressPhotosPage'),
)

type AppShellProps = {
  children: ReactNode
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

function AppShell({
  children,
  activeTab,
  onTabChange,
}: AppShellProps) {
  const [libraryRevision, setLibraryRevision] =
    useState(0)

  const [routinesView, setRoutinesView] =
    useState<'weekly' | 'manager'>('weekly')

  const [progressView, setProgressView] =
    useState<'workouts' | 'body'>('workouts')

  const [workoutsView, setWorkoutsView] =
    useState<'history' | 'strength' | 'statistics'>(
      'history',
    )

  const [bodyView, setBodyView] =
    useState<'measurements' | 'photos'>(
      'measurements',
    )

  const [appearance, setAppearance] =
    useState<AppSettings>(APPEARANCE_DEFAULTS)

  const [savingAppearance, setSavingAppearance] =
    useState(false)

  const [appearanceError, setAppearanceError] =
    useState('')

  // Carga la apariencia sin necesidad de abrir Más.

  useEffect(() => {
    let cancelled = false

    async function loadAppearance() {
      try {
        const stored = await db.appSettings.get(
          'appearance',
        )

        if (!cancelled) {
          setAppearance(safeAppearance(stored))
        }
      } catch (cause) {
        if (!cancelled) {
          setAppearanceError(
            cause instanceof Error
              ? cause.message
              : 'No se pudieron leer tus preferencias.',
          )
        }
      }
    }

    void loadAppearance()

    return () => {
      cancelled = true
    }
  }, [])

  // Aplica modo oscuro, tipografía y color principal.

  useEffect(() => {
    const root = document.documentElement

    const media = window.matchMedia(
      '(prefers-color-scheme: dark)',
    )

    const applyTheme = () => {
      root.dataset.theme =
        appearance.themeMode === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : appearance.themeMode
    }

    applyTheme()

    root.dataset.font = appearance.fontFamily
    root.dataset.fontScale = appearance.fontScale

    root.style.setProperty(
      '--gym-accent',
      appearance.accentColor,
    )

    media.addEventListener('change', applyTheme)

    return () => {
      media.removeEventListener(
        'change',
        applyTheme,
      )
    }
  }, [appearance])

  // Guarda las preferencias de apariencia.

  async function changeAppearance(
    change: Partial<
      Pick<
        AppSettings,
        | 'themeMode'
        | 'accentColor'
        | 'fontFamily'
        | 'fontScale'
      >
    >,
  ) {
    if (savingAppearance) return

    const before = appearance

    const next: AppSettings = {
      ...appearance,
      ...change,
      id: 'appearance',
      updatedAt: new Date().toISOString(),
    }

    setAppearance(next)
    setSavingAppearance(true)
    setAppearanceError('')

    try {
      await db.appSettings.put(next)
    } catch (cause) {
      setAppearance(before)

      setAppearanceError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron guardar los cambios.',
      )
    } finally {
      setSavingAppearance(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      {/* NAVEGACIÓN DE ESCRITORIO */}

      <DesktopNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* CONTENIDO PRINCIPAL */}

      <main
        className="
          mx-auto w-full max-w-md
          px-4 py-6 pb-28
          sm:px-6 sm:py-8
          md:max-w-2xl
          lg:max-w-5xl
          lg:px-8 lg:py-10 lg:pb-10
        "
      >
        {/* MENSAJE MIENTRAS CARGA UNA PANTALLA */}

        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="
                rounded-2xl
                border border-[var(--color-border)]
                bg-[var(--color-surface)]
                p-5 text-center text-sm
                text-[var(--color-text-secondary)]
              "
            >
              Cargando sección…
            </div>
          }
        >
          {/* HOY */}

          {activeTab === 'today' && children}

          {/* ENTRENAR */}

          {activeTab === 'workout' && (
            <WorkoutPage />
          )}

          {/* PROGRESO */}

          {activeTab === 'progress' && (
            <div className="space-y-5">
              <div
                className="
                  grid grid-cols-2 gap-2
                  rounded-2xl
                  border border-[var(--color-border)]
                  bg-[var(--color-surface)] p-2
                "
                aria-label="Tipo de progreso"
              >
                <button
                  type="button"
                  aria-pressed={
                    progressView === 'workouts'
                  }
                  onClick={() =>
                    setProgressView('workouts')
                  }
                  className={`
                    min-h-11 rounded-xl px-3 py-2
                    text-sm font-bold transition
                    ${
                      progressView === 'workouts'
                        ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                        : 'text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  Entrenamientos
                </button>

                <button
                  type="button"
                  aria-pressed={
                    progressView === 'body'
                  }
                  onClick={() =>
                    setProgressView('body')
                  }
                  className={`
                    min-h-11 rounded-xl px-3 py-2
                    text-sm font-bold transition
                    ${
                      progressView === 'body'
                        ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                        : 'text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  Mi cuerpo
                </button>
              </div>

              {progressView === 'workouts' ? (
                <div className="space-y-5">
                  <div
                    className="
                      grid grid-cols-3 gap-2
                      rounded-2xl
                      border border-[var(--color-border)]
                      bg-[var(--color-surface)] p-2
                    "
                    aria-label="Sección de entrenamientos"
                  >
                    <button
                      type="button"
                      aria-pressed={
                        workoutsView === 'history'
                      }
                      onClick={() =>
                        setWorkoutsView('history')
                      }
                      className={`
                        min-h-11 rounded-xl px-1 py-2
                        text-xs font-bold transition
                        sm:text-sm
                        ${
                          workoutsView === 'history'
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      Historial
                    </button>

                    <button
                      type="button"
                      aria-pressed={
                        workoutsView === 'strength'
                      }
                      onClick={() =>
                        setWorkoutsView('strength')
                      }
                      className={`
                        min-h-11 rounded-xl px-1 py-2
                        text-xs font-bold transition
                        sm:text-sm
                        ${
                          workoutsView === 'strength'
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      Fuerza y récords
                    </button>

                    <button
                      type="button"
                      aria-pressed={
                        workoutsView === 'statistics'
                      }
                      onClick={() =>
                        setWorkoutsView('statistics')
                      }
                      className={`
                        min-h-11 rounded-xl px-1 py-2
                        text-xs font-bold transition
                        sm:text-sm
                        ${
                          workoutsView === 'statistics'
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      Estadísticas
                    </button>
                  </div>

                  {workoutsView === 'history' ? (
                    <WorkoutHistoryPage
                      onNavigate={onTabChange}
                    />
                  ) : workoutsView === 'strength' ? (
                    <StrengthProgressPage />
                  ) : (
                    <TrainingStatisticsPage />
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div
                    className="
                      grid grid-cols-2 gap-2
                      rounded-2xl
                      border border-[var(--color-border)]
                      bg-[var(--color-surface)] p-2
                    "
                    aria-label="Sección de Mi cuerpo"
                  >
                    <button
                      type="button"
                      aria-pressed={
                        bodyView === 'measurements'
                      }
                      onClick={() =>
                        setBodyView('measurements')
                      }
                      className={`
                        min-h-11 rounded-xl px-3 py-2
                        text-sm font-bold transition
                        ${
                          bodyView === 'measurements'
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      Medidas y peso
                    </button>

                    <button
                      type="button"
                      aria-pressed={
                        bodyView === 'photos'
                      }
                      onClick={() =>
                        setBodyView('photos')
                      }
                      className={`
                        min-h-11 rounded-xl px-3 py-2
                        text-sm font-bold transition
                        ${
                          bodyView === 'photos'
                            ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      Fotografías
                    </button>
                  </div>

                  {bodyView === 'measurements' ? (
                    <BodyProgressPage />
                  ) : (
                    <ProgressPhotosPage />
                  )}
                </div>
              )}
            </div>
          )}

          {/* RUTINAS */}

          {activeTab === 'routines' && (
            <div className="space-y-5">
              <div
                className="
                  grid grid-cols-2 gap-2
                  rounded-2xl
                  border border-[var(--color-border)]
                  bg-[var(--color-surface)] p-2
                "
                aria-label="Opciones de rutinas"
              >
                <button
                  type="button"
                  aria-pressed={
                    routinesView === 'weekly'
                  }
                  onClick={() =>
                    setRoutinesView('weekly')
                  }
                  className={`
                    min-h-11 rounded-xl px-2 py-2
                    text-sm font-bold transition
                    ${
                      routinesView === 'weekly'
                        ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                        : 'text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  Plan semanal
                </button>

                <button
                  type="button"
                  aria-pressed={
                    routinesView === 'manager'
                  }
                  onClick={() =>
                    setRoutinesView('manager')
                  }
                  className={`
                    min-h-11 rounded-xl px-2 py-2
                    text-sm font-bold transition
                    ${
                      routinesView === 'manager'
                        ? 'bg-[var(--color-button-primary)] text-[var(--color-button-text)]'
                        : 'text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  Mis rutinas
                </button>
              </div>

              {routinesView === 'weekly' ? (
                <WeeklyPlannerPage />
              ) : (
                <RoutineManager />
              )}
            </div>
          )}

          {/* MÁS */}

          {activeTab === 'more' && (
            <section className="space-y-5">
              <header>
                <p
                  className="
                    text-sm font-semibold
                    text-[var(--color-primary)]
                  "
                >
                  HERRAMIENTAS
                </p>

                <h1
                  className="
                    mt-1 text-3xl font-bold
                    text-[var(--color-text-primary)]
                  "
                >
                  Más
                </h1>

                <p
                  className="
                    mt-2 text-base
                    text-[var(--color-text-secondary)]
                  "
                >
                  Administra tus datos y tu
                  biblioteca de ejercicios.
                </p>
              </header>

              <AppearanceSettings
                settings={appearance}
                saving={savingAppearance}
                error={appearanceError}
                onChange={(change) => {
                  void changeAppearance(change)
                }}
              />

              <BackupManager />

              <ExerciseCatalogImporter
                onImported={() =>
                  setLibraryRevision(
                    (previous) => previous + 1,
                  )
                }
              />

              <ExerciseManager
                key={libraryRevision}
              />
            </section>
          )}
        </Suspense>
      </main>

      {/* NAVEGACIÓN MÓVIL */}

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  )
}

export default AppShell
