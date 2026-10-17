
import { navigationItems } from './navigation'
import type { AppTab } from './navigation'

type DesktopNavigationProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

function DesktopNavigation({
  activeTab,
  onTabChange,
}: DesktopNavigationProps) {
  return (
    <header
      className="
        hidden
        border-b
        border-[var(--color-border)]
        bg-[var(--color-surface)]/95
        backdrop-blur
        lg:block
      "
    >
      <div
        className="
          mx-auto
          flex
          min-h-18
          w-full
          max-w-5xl
          items-center
          justify-between
          px-8
        "
      >
        <div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            Gym Tracker
          </p>

          <p className="text-xs text-[var(--color-text-secondary)]">
            Entrena. Registra. Progresa.
          </p>
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex items-center gap-1"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon

            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex
                  min-h-11
                  items-center
                  gap-2
                  rounded-xl
                  px-4
                  py-2
                  text-sm
                  font-medium
                  transition
                  duration-200
                  ${
                    isActive
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]'
                  }
                `}
              >
                <Icon
                  aria-hidden="true"
                  size={19}
                  strokeWidth={2}
                />

                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

export default DesktopNavigation
