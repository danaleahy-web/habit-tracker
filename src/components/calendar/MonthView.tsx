import type { CalendarData } from '../../hooks/useCalendarData'
import { getMonthGrid, toDateKey, DAY_NAMES_SHORT } from '../../lib/dates'
import { DayCell } from './DayCell'

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
    <div className="px-2">
      <div className="rounded-xl border border-border bg-paper p-2.5 dark:border-border-dark dark:bg-paper-dark">
        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {DAY_NAMES_SHORT.map((name) => (
            <div key={name} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {weeks.flat().map((day) => {
            const key = toDateKey(day)
            return (
              <DayCell
                key={key}
                date={day}
                referenceDate={date}
                completions={data.completions.get(key) || []}
                activities={data.activities.get(key) || []}
                compact
                onSelect={onSelectDay}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-ink dark:bg-gray-400" />
          Habit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-accent">▪</span>
          Activity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-md ring-1 ring-ink dark:ring-gray-400" />
          Today
        </span>
      </div>
    </div>
  )
}
