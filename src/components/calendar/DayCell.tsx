import type { HabitCompletion, Activity } from '../../db/index'
import { isToday, isSameMonth } from '../../lib/dates'

interface DayCellProps {
  date: Date
  referenceDate: Date
  completions: HabitCompletion[]
  activities: Activity[]
  compact?: boolean
  onSelect: (date: Date) => void
}

export function DayCell({
  date,
  referenceDate,
  completions,
  activities,
  compact = false,
  onSelect,
}: DayCellProps) {
  const today = isToday(date)
  const inMonth = isSameMonth(date, referenceDate)
  const hasActivities = activities.length > 0
  const uniqueHabits = [...new Set(completions.map((c) => c.habitId))]

  return (
    <button
      onClick={() => onSelect(date)}
      className={`
        relative flex flex-col items-center rounded-md transition-colors
        ${compact ? 'gap-0.5 px-0.5 py-1.5' : 'gap-1 p-2'}
        ${inMonth ? '' : 'opacity-25'}
        ${today
          ? 'bg-ink/5 ring-1 ring-ink dark:bg-gray-100/10 dark:ring-gray-400'
          : 'hover:bg-background dark:hover:bg-background-dark'
        }
      `}
    >
      <span
        className={`text-sm leading-none ${
          today
            ? 'font-bold text-ink dark:text-gray-100'
            : inMonth
              ? 'text-ink-light dark:text-gray-300'
              : 'text-muted'
        }`}
      >
        {date.getDate()}
      </span>

      {/* Completion dots */}
      {uniqueHabits.length > 0 && (
        <div className="flex gap-0.5">
          {uniqueHabits.slice(0, compact ? 3 : 5).map((habitId) => (
            <span
              key={habitId}
              className={`block rounded-full bg-ink dark:bg-gray-400 ${
                compact ? 'h-1 w-1' : 'h-1.5 w-1.5'
              }`}
            />
          ))}
        </div>
      )}

      {/* Activity indicator */}
      {hasActivities && (
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} leading-none text-accent`}>
          ▪
        </span>
      )}
    </button>
  )
}
