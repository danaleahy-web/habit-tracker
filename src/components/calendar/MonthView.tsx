import type { CalendarData } from '../../hooks/useCalendarData'
import type { HabitCompletion, Activity } from '../../db/index'
import { getMonthGrid, toDateKey, isToday, isSameMonth, DAY_NAMES_SHORT } from '../../lib/dates'

interface MonthViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

export function MonthView({ date, data, onSelectDay }: MonthViewProps) {
  const grid = getMonthGrid(date)
  const weeks: Date[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  return (
    <div className="flex h-full flex-col px-1">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {DAY_NAMES_SHORT.map((name) => (
          <div key={name} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid — each week row stretches equally to fill height */}
      <div className="grid flex-1 grid-cols-7">
        {weeks.flat().map((day) => {
          const key = toDateKey(day)
          return (
            <MonthDayCell
              key={key}
              date={day}
              referenceDate={date}
              completions={data.completions.get(key) || []}
              activities={data.activities.get(key) || []}
              onSelect={onSelectDay}
              totalWeeks={weeks.length}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 py-2 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-ink dark:bg-gray-400" />
          Habit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-accent">▪</span>
          Activity
        </span>
      </div>
    </div>
  )
}

/** Full-page day cell for the month grid */
function MonthDayCell({
  date,
  referenceDate,
  completions,
  activities,
  onSelect,
}: {
  date: Date
  referenceDate: Date
  completions: HabitCompletion[]
  activities: Activity[]
  onSelect: (date: Date) => void
  totalWeeks: number
}) {
  const today = isToday(date)
  const inMonth = isSameMonth(date, referenceDate)
  const hasActivities = activities.length > 0
  const uniqueHabits = [...new Set(completions.map((c) => c.habitId))]

  return (
    <button
      onClick={() => onSelect(date)}
      className={`
        flex flex-col items-center justify-start gap-1 border-b border-r border-border
        px-0.5 pb-1 pt-2 transition-colors
        dark:border-border-dark
        ${inMonth ? '' : 'opacity-20'}
        ${today
          ? 'bg-ink/5 dark:bg-gray-100/10'
          : 'hover:bg-background dark:hover:bg-background-dark'
        }
      `}
    >
      {/* Day number */}
      <span
        className={`text-sm leading-none ${
          today
            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-ink font-bold text-paper dark:bg-gray-300 dark:text-gray-900'
            : inMonth
              ? 'text-ink-light dark:text-gray-300'
              : 'text-muted'
        }`}
      >
        {date.getDate()}
      </span>

      {/* Habit dots */}
      {uniqueHabits.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[3px]">
          {uniqueHabits.slice(0, 4).map((habitId) => (
            <span
              key={habitId}
              className="block h-1.5 w-1.5 rounded-full bg-ink dark:bg-gray-400"
            />
          ))}
          {uniqueHabits.length > 4 && (
            <span className="text-[7px] leading-none text-muted">+</span>
          )}
        </div>
      )}

      {/* Activity marker */}
      {hasActivities && (
        <span className="text-[10px] leading-none text-accent">▪</span>
      )}
    </button>
  )
}
