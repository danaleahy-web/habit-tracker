import type { CalendarData } from '../../hooks/useCalendarData'
import { getMonthGrid, toDateKey, isToday, isSameMonth, DAY_NAMES_SHORT } from '../../lib/dates'
import { isScheduledForDate } from '../../lib/schedule'

interface MonthViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)}km` : `${Math.round(meters)}m`
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
          <div key={name} className="py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7">
        {weeks.flat().map((day) => {
          const key = toDateKey(day)
          const today = isToday(day)
          const inMonth = isSameMonth(day, date)
          const completions = data.completions.get(key) || []
          const workoutLogs = data.workoutLogs.get(key) || []
          const activities = data.activities.get(key) || []
          const completedHabitIds = new Set(completions.map((c) => c.habitId))
          const scheduledHabits = data.habits.filter((h) => isScheduledForDate(h, day))
          const scheduledWorkouts = data.workouts.filter((w) => isScheduledForDate(w, day))

          // Workout done check (same logic as weekly view)
          const isWorkoutDone = (w: typeof data.workouts[0]) => {
            const log = workoutLogs.find((l) => l.workoutId === w.id)
            if (!log) return false
            const completedSet = new Set(log.completedExercises || [])
            const templateDone = w.exercises.filter((_, i) => completedSet.has(i)).length
            const extrasCompletedSet = new Set(log.completedExtras || [])
            const extrasDone = (log.extraExercises || []).filter((_, i) => extrasCompletedSet.has(i)).length
            const totalDone = templateDone + extrasDone
            const totalEx = w.exercises.length + (log.extraExercises || []).length
            if (totalEx === 0 || totalDone === 0) return false
            return totalDone >= (w.minExercisesToComplete ?? totalEx)
          }

          return (
            <button
              key={key}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col border-b border-r border-border px-1 pb-0.5 pt-1 text-left transition-colors dark:border-border-dark overflow-hidden ${
                inMonth ? '' : 'opacity-20'
              } ${today ? 'bg-ink/5 dark:bg-gray-100/10' : 'hover:bg-background dark:hover:bg-background-dark'}`}
            >
              {/* Day number */}
              <span className={`mb-0.5 text-xs leading-none ${
                today
                  ? 'flex h-5 w-5 items-center justify-center rounded-full bg-ink font-bold text-paper dark:bg-gray-300 dark:text-gray-900'
                  : inMonth ? 'text-ink-light dark:text-gray-300' : 'text-muted'
              }`}>
                {day.getDate()}
              </span>

              {/* Content */}
              <div className="flex-1 space-y-0 overflow-hidden">
                {/* Habits */}
                {scheduledHabits.map((h) => {
                  const done = h.id != null && completedHabitIds.has(h.id)
                  return (
                    <p key={h.id} className={`truncate text-[10px] leading-snug ${done ? 'text-muted line-through' : 'text-ink-light dark:text-gray-400'}`}>
                      {h.name}
                    </p>
                  )
                })}

                {/* Workouts */}
                {scheduledWorkouts.map((w) => {
                  const done = w.id != null && isWorkoutDone(w)
                  return (
                    <p key={w.id} className={`truncate text-[10px] leading-snug ${done ? 'text-muted line-through' : 'text-ink-light dark:text-gray-400'}`}>
                      {w.name}
                    </p>
                  )
                })}

                {/* Activities */}
                {activities.map((a) => (
                  <p key={a.stravaId} className="truncate text-[10px] leading-snug text-muted line-through">
                    {a.type} {formatDistance(a.distanceMeters)}
                  </p>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
