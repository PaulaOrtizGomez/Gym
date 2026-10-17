import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PrimaryButtonProps = {
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

function PrimaryButton({
  children,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={`
        min-h-12
        w-full
        rounded-[var(--radius-lg)]
        bg-[var(--color-button-primary)]
        px-6
        py-3
        text-base
        font-semibold
        text-[var(--color-button-text)]
        shadow-sm
        transition
        duration-200
        hover:bg-[var(--color-button-primary-hover)]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export default PrimaryButton