import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

export interface BottomItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

/** Fixed tab bar for phones (hidden from md up, where the top navigation is shown). */
export function BottomNav({ items, label }: { items: BottomItem[]; label: string }) {
  return (
    <nav aria-label={label} className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
