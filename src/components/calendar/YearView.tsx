import type { CalendarData } from '../../hooks/useCalendarData'
import { getYearMonths, toDateKey, isToday, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../../lib/dates'

interface YearViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

export function YearView({ date, data, onSelectDay }: YearViewProps) {
  const year = date.getFullYear()
  const months = getYearMonths(year)

  // Pre-compute completion and activity sets for fast lookup
  const completionDays = new Set<string>()
  for (const key of data.completions.keys()) completionDays.add(key)

  const workoutDays = new Set<string>()
  for (const key of data.workoutLogs.keys()) workoutDays.add(key)

  const activityDays = new Set<string>()
  for (const key of data.activities.keys()) activityDays.add(key)

  return (
    <div className="flex h-full flex-col overflow-y-auto px-2">
      <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
        {months.map((monthDays, mi) => {
          const firstDow = monthDays[0].getDay()
          const padded: (Date | null)[] = [
            ...Array.from<null>({ length: firstDow }).fill(null),
            ...monthDays,
          ]

          return (
            <div key={mi} className="rounded-lg border border-border bg-paper p-2 dark:border-border-dark dark:bg-paper-dark">
              {/* Month name */}
              <p className="mb-1.5 text-sm font-bold text-ink dark:text-gray-200">
                {MONTH_NAMES_SHORT[mi]}
              </p>

              {/* Day-of-week header */}
              <div className="mb-0.5 grid grid-cols-7 gap-[1px]">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="text-center text-[7px] font-semibold uppercase text-muted">
                    {d[0]}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-[1px]">
                {padded.map((day, idx) => {
                  if (!day) return <div key={`p-${idx}`} className="aspect-square" />

                  const key = toDateKey(day)
                  const today = isToday(day)
                  const hasCompletion = completionDays.has(key)
                  const hasWorkout = workoutDays.has(key)
                  const hasActivity = activityDays.has(key)
                  const hasAnything = hasCompletion || hasWorkout || hasActivity

                  return (
                    <button
                      key={key}
                      onClick={() => onSelectDay(day)}
                      className={`aspect-square rounded-[2px] text-[7px] font-medium leading-none ${
                        hasAnything
                          ? 'bg-ink text-paper dark:bg-gray-400 dark:text-gray-900'
                          : 'text-muted'
                      } ${today ? 'ring-1 ring-accent' : ''}`}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
