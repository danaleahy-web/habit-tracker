import type { CalendarData } from '../../hooks/useCalendarData'
import type { Habit } from '../../db/index'
import { getWeekDays, toDateKey, isToday, DAY_NAMES_SHORT } from '../../lib/dates'

interface WeekViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)}km` : `${Math.round(meters)}m`
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}m`
}

export function WeekView({ date, data, onSelectDay }: WeekViewProps) {
  const days = getWeekDays(date)
  const habitMap = new Map<number, Habit>()
  for (const h of data.habits) {
    if (h.id != null) habitMap.set(h.id, h)
  }

  return (
    <div className="px-1.5">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = toDateKey(day)
          const today = isToday(day)
          const completions = data.completions.get(key) || []
          const activities = data.activities.get(key) || []
          const uniqueHabitIds = [...new Set(completions.map((c) => c.habitId))]

          return (
            <button
              key={key}
              onClick={() => onSelectDay(day)}
              className={`flex min-h-[110px] flex-col rounded-lg border p-1.5 text-left transition-colors ${
                today
                  ? 'border-ink/30 bg-ink/[0.03] dark:border-gray-500 dark:bg-gray-100/5'
                  : 'border-border bg-paper hover:bg-background dark:border-border-dark dark:bg-paper-dark dark:hover:bg-background-dark'
              }`}
            >
              {/* Day header */}
              <div className="mb-1.5 text-center">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                  {DAY_NAMES_SHORT[day.getDay()]}
                </div>
                <div className={`text-lg font-bold leading-tight ${
                  today ? 'text-ink dark:text-gray-100' : 'text-ink-light dark:text-gray-300'
                }`}>
                  {day.getDate()}
                </div>
              </div>

              {/* Habit bullets */}
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {uniqueHabitIds.slice(0, 4).map((hid) => {
                  const habit = habitMap.get(hid)
                  return (
                    <div key={hid} className="flex items-center gap-1 truncate">
                      <span className="text-[9px] text-ink dark:text-gray-400">{habit?.emoji || '·'}</span>
                      <span className="truncate text-[8px] text-ink-light dark:text-gray-500">
                        {habit?.name || 'Habit'}
                      </span>
                    </div>
                  )
                })}
                {uniqueHabitIds.length > 4 && (
                  <span className="text-[8px] text-muted">+{uniqueHabitIds.length - 4}</span>
                )}
              </div>

              {/* Activity summary */}
              {activities.length > 0 && (
                <div className="mt-1 border-t border-border pt-1 dark:border-border-dark">
                  {activities.slice(0, 2).map((a) => (
                    <div key={a.stravaId} className="text-[8px] text-muted">
                      {a.type} · {formatDistance(a.distanceMeters)} · {formatDuration(a.movingTimeSecs)}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty dot */}
              {uniqueHabitIds.length === 0 && activities.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <span className="block h-1 w-1 rounded-full bg-border dark:bg-border-dark" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
