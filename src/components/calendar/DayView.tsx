import { useState } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import { toggleCompletion } from '../../db/habits'
import { toggleWorkoutLog } from '../../db/workouts'
import { toDateKey, formatDayFull, isToday } from '../../lib/dates'

interface DayViewProps {
  date: Date
  data: CalendarData
  onDataChange?: () => void
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatPace(meters: number, secs: number): string {
  if (meters === 0) return '—'
  const paceSecsPerKm = secs / (meters / 1000)
  const m = Math.floor(paceSecsPerKm / 60)
  const s = Math.round(paceSecsPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

export function DayView({ date, data, onDataChange }: DayViewProps) {
  const key = toDateKey(date)
  const today = isToday(date)
  const completions = data.completions.get(key) || []
  const workoutLogs = data.workoutLogs.get(key) || []
  const activities = data.activities.get(key) || []
  const completedHabitIds = new Set(completions.map((c) => c.habitId))
  const loggedWorkoutIds = new Set(workoutLogs.map((l) => l.workoutId))

  const [pendingHabitToggles, setPendingHabitToggles] = useState<Set<number>>(new Set())
  const [pendingWorkoutToggles, setPendingWorkoutToggles] = useState<Set<number>>(new Set())
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null)

  // Habit toggle
  const handleHabitToggle = async (habitId: number) => {
    if (pendingHabitToggles.has(habitId)) return
    setPendingHabitToggles((prev) => new Set(prev).add(habitId))
    try { await toggleCompletion(habitId, date); onDataChange?.() }
    finally { setPendingHabitToggles((prev) => { const n = new Set(prev); n.delete(habitId); return n }) }
  }

  const isHabitDone = (habitId: number) => {
    const dbState = completedHabitIds.has(habitId)
    return pendingHabitToggles.has(habitId) ? !dbState : dbState
  }

  // Workout toggle
  const handleWorkoutToggle = async (workoutId: number) => {
    if (pendingWorkoutToggles.has(workoutId)) return
    setPendingWorkoutToggles((prev) => new Set(prev).add(workoutId))
    try { await toggleWorkoutLog(workoutId, date); onDataChange?.() }
    finally { setPendingWorkoutToggles((prev) => { const n = new Set(prev); n.delete(workoutId); return n }) }
  }

  const isWorkoutDone = (workoutId: number) => {
    const dbState = loggedWorkoutIds.has(workoutId)
    return pendingWorkoutToggles.has(workoutId) ? !dbState : dbState
  }

  const completedHabitCount = data.habits.filter((h) => h.id != null && isHabitDone(h.id!)).length
  const completedWorkoutCount = data.workouts.filter((w) => w.id != null && isWorkoutDone(w.id!)).length
  const totalItems = data.habits.length + data.workouts.length
  const totalCompleted = completedHabitCount + completedWorkoutCount

  return (
    <div className="flex h-full flex-col">
      {/* Date heading */}
      <div className="border-b border-border px-4 pb-2 dark:border-border-dark">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          {today ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-ink dark:text-gray-100">
          {formatDayFull(date)}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Habits */}
        {data.habits.length > 0 && (
          <div className="border-b border-border dark:border-border-dark">
            <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Habits
            </h3>
            <ul>
              {data.habits.map((habit) => {
                const done = habit.id != null && isHabitDone(habit.id)
                const toggling = habit.id != null && pendingHabitToggles.has(habit.id)
                return (
                  <li key={habit.id} className="flex items-center gap-3 border-t border-border px-4 py-3 dark:border-border-dark">
                    <button
                      onClick={() => habit.id != null && handleHabitToggle(habit.id)}
                      disabled={toggling}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                        done
                          ? 'border-ink bg-ink text-paper dark:border-gray-400 dark:bg-gray-400 dark:text-gray-900'
                          : 'border-border hover:border-ink-light dark:border-border-dark dark:hover:border-gray-500'
                      } ${toggling ? 'opacity-50' : 'active:scale-90'}`}
                    >
                      {done && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-ink-light dark:text-gray-400">{habit.emoji}</span>
                    <span className={`flex-1 text-sm transition-colors ${
                      done ? 'text-muted line-through' : 'text-ink dark:text-gray-200'
                    }`}>
                      {habit.name}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Workouts */}
        {data.workouts.length > 0 && (
          <div className="border-b border-border dark:border-border-dark">
            <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Workouts
            </h3>
            <ul>
              {data.workouts.map((workout) => {
                const done = workout.id != null && isWorkoutDone(workout.id)
                const toggling = workout.id != null && pendingWorkoutToggles.has(workout.id)
                const isExpanded = expandedWorkout === workout.id
                return (
                  <li key={workout.id} className="border-t border-border dark:border-border-dark">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => workout.id != null && handleWorkoutToggle(workout.id)}
                        disabled={toggling}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                          done
                            ? 'border-ink bg-ink text-paper dark:border-gray-400 dark:bg-gray-400 dark:text-gray-900'
                            : 'border-border hover:border-ink-light dark:border-border-dark dark:hover:border-gray-500'
                        } ${toggling ? 'opacity-50' : 'active:scale-90'}`}
                      >
                        {done && (
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <span className="text-sm text-ink-light dark:text-gray-400">{workout.emoji}</span>
                      {/* Name + expand */}
                      <button
                        onClick={() => setExpandedWorkout(isExpanded ? null : workout.id!)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className={`flex-1 text-sm transition-colors ${
                          done ? 'text-muted line-through' : 'text-ink dark:text-gray-200'
                        }`}>
                          {workout.name}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted dark:border-border-dark">
                          {workout.exercises.length} ex.
                        </span>
                        <svg className={`h-3 w-3 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {/* Expanded exercises */}
                    {isExpanded && (
                      <div className="border-t border-border bg-background px-4 py-2.5 dark:border-border-dark dark:bg-background-dark">
                        <ul className="space-y-1">
                          {workout.exercises.map((ex, i) => (
                            <li key={i} className="flex items-baseline gap-2 text-xs">
                              <span className="text-muted">{i + 1}.</span>
                              <span className="flex-1 text-ink-light dark:text-gray-400">{ex.name}</span>
                              <span className="text-muted">
                                {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}${ex.unit || 'kg'}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Progress bar (habits + workouts combined) */}
        {totalItems > 0 && (
          <div className="border-b border-border px-4 py-2.5 dark:border-border-dark">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">{totalCompleted} of {totalItems}</span>
              <span className="font-semibold text-ink-light dark:text-gray-400">
                {Math.round((totalCompleted / totalItems) * 100)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border dark:bg-border-dark">
              <div
                className="h-full rounded-full bg-ink transition-all duration-300 dark:bg-gray-400"
                style={{ width: `${(totalCompleted / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.habits.length === 0 && data.workouts.length === 0 && (
          <div className="border-b border-border px-4 py-6 text-center dark:border-border-dark">
            <p className="text-sm text-muted">No habits or workouts yet.</p>
            <p className="mt-1 text-xs text-muted">Head to the Plan tab to add some.</p>
          </div>
        )}

        {/* Strava Activities */}
        <div>
          <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
            Activities
          </h3>
          {activities.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted">No activities on this day.</p>
            </div>
          ) : (
            <ul>
              {activities.map((activity) => (
                <li key={activity.stravaId} className="border-t border-border px-4 py-3 dark:border-border-dark">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink dark:text-gray-100">{activity.name}</span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted dark:border-border-dark">
                      {activity.type}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    <span>{formatDistance(activity.distanceMeters)}</span>
                    <span>{formatDuration(activity.movingTimeSecs)}</span>
                    <span>{formatPace(activity.distanceMeters, activity.movingTimeSecs)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
