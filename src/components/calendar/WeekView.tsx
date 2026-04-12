import type { CalendarData } from '../../hooks/useCalendarData'
import type { Habit } from '../../db/index'
import { getWeekDays, toDateKey, isToday, DAY_NAMES_SHORT } from '../../lib/dates'
import { isScheduledForDate } from '../../lib/schedule'

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
    <div className="flex h-full flex-col">
      {days.map((day, i) => {
        const key = toDateKey(day)
        const today = isToday(day)
        const completions = data.completions.get(key) || []
        const workoutLogs = data.workoutLogs.get(key) || []
        const activities = data.activities.get(key) || []
        const scheduledHabits = data.habits.filter((h) => isScheduledForDate(h, day))
        const scheduledWorkouts = data.workouts.filter((w) => isScheduledForDate(w, day))
        const completedHabitIds = new Set(completions.map((c) => c.habitId))
        const loggedWorkoutIds = new Set(workoutLogs.map((l) => l.workoutId))
        const isLast = i === days.length - 1

        return (
          <button
            key={key}
            onClick={() => onSelectDay(day)}
            className={`flex flex-1 items-start gap-3 text-left transition-colors ${
              !isLast ? 'border-b border-border dark:border-border-dark' : ''
            } px-3 py-2 ${
              today
                ? 'bg-ink/[0.03] dark:bg-gray-100/5'
                : 'hover:bg-background dark:hover:bg-background-dark'
            }`}
          >
            {/* Left: day label */}
            <div className="w-10 shrink-0 pt-0.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {DAY_NAMES_SHORT[day.getDay()]}
              </div>
              <div className={`text-xl font-bold leading-tight ${
                today ? 'text-ink dark:text-gray-100' : 'text-ink-light dark:text-gray-300'
              }`}>
                {day.getDate()}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-border dark:bg-border-dark" />

            {/* Right: habits + workouts + activities */}
            <div className="min-w-0 flex-1 pt-0.5">
              {/* Scheduled habits */}
              {scheduledHabits.length > 0 && (
                <div className="space-y-0.5">
                  {scheduledHabits.map((habit) => {
                    const done = habit.id != null && completedHabitIds.has(habit.id)
                    return (
                      <div key={habit.id} className="flex items-center gap-1.5 truncate">
                        <span className={`text-xs ${done ? 'text-accent' : 'text-ink dark:text-gray-400'}`}>{habit.emoji}</span>
                        <span className={`truncate text-xs ${done ? 'text-muted line-through' : 'text-ink-light dark:text-gray-400'}`}>
                          {habit.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Scheduled workouts */}
              {scheduledWorkouts.length > 0 && (
                <div className={scheduledHabits.length > 0 ? 'mt-1 border-t border-border pt-1 dark:border-border-dark' : ''}>
                  {scheduledWorkouts.map((w) => {
                    const done = w.id != null && loggedWorkoutIds.has(w.id)
                    return (
                      <div key={w.id} className="flex items-center gap-1.5 truncate">
                        <span className={`text-xs ${done ? 'text-accent' : 'text-ink dark:text-gray-400'}`}>{w.emoji}</span>
                        <span className={`truncate text-xs ${done ? 'text-muted line-through' : 'text-ink-light dark:text-gray-400'}`}>
                          {w.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Activities */}
              {activities.length > 0 && (
                <div className={(scheduledHabits.length > 0 || scheduledWorkouts.length > 0) ? 'mt-1 border-t border-border pt-1 dark:border-border-dark' : ''}>
                  {activities.map((a) => (
                    <div key={a.stravaId} className="flex items-baseline gap-2 text-xs text-muted">
                      <span className="font-medium text-ink-light dark:text-gray-400">{a.type}</span>
                      <span>{formatDistance(a.distanceMeters)}</span>
                      <span>{formatDuration(a.movingTimeSecs)}</span>
                    </div>
                  ))}
                </div>
              )}

              {scheduledHabits.length === 0 && scheduledWorkouts.length === 0 && activities.length === 0 && (
                <p className="text-xs text-muted">—</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
