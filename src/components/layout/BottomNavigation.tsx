
import { navigationItems } from './navigation'
import type { AppTab } from './navigation'

type BottomNavigationProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-sm lg:hidden"
    >
      <div
        className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 px-2 pt-2 pb-2"
        style={{
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}
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
              aria-label={item.label}
              className={`
                flex min-h-14 min-w-0 touch-manipulation select-none
                flex-col items-center justify-center gap-1
                rounded-xl px-0.5 py-1
                transition-colors duration-150
                focus-visible:outline-2 focus-visible:outline-offset-[-2px]
                focus-visible:outline-[var(--color-primary)]
                motion-reduce:transition-none
                ${
                  isActive
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] active:bg-[var(--color-surface-soft)]'
                }
              `}
            >
              <Icon
                aria-hidden="true"
                className="shrink-0"
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="block max-w-full truncate text-[clamp(0.63rem,2.7vw,0.72rem)] font-semibold leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
