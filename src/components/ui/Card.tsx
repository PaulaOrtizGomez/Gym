import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = {
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

function Card({
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-[var(--radius-xl)]
        border
        border-[var(--color-border)]
        bg-[var(--color-surface)]
        p-5
        shadow-[var(--shadow-soft)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card