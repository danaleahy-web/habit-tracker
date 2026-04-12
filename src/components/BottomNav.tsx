import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Journal' },
  { to: '/plan', label: 'Plan' },
  { to: '/settings', label: 'Settings' },
] as const

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] dark:border-border-dark dark:bg-surface-dark">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2.5 text-xs uppercase tracking-widest transition-colors ${
              isActive
                ? 'font-semibold text-ink dark:text-gray-100'
                : 'text-muted dark:text-gray-500'
            }`
          }
        >
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
