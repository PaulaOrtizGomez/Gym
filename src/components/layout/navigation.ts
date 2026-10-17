
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  ListChecks,
  MoreHorizontal,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export type AppTab =
  | 'today'
  | 'workout'
  | 'progress'
  | 'routines'
  | 'more'

export type NavigationItem = {
  id: AppTab
  label: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'today',
    label: 'Hoy',
    icon: CalendarDays,
  },
  {
    id: 'workout',
    label: 'Entrenar',
    icon: Dumbbell,
  },
  {
    id: 'progress',
    label: 'Progreso',
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    id: 'routines',
    label: 'Rutinas',
    icon: ListChecks,
  },
  {
    id: 'more',
    label: 'Más',
    icon: MoreHorizontal,
  },
]
