import { useState } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import { toggleCompletion } from '../../db/habits'
import { toggleExerciseInLog } from '../../db/workouts'
import { toDateKey, formatDayFull, isToday } from '../../lib/dates'
import { isScheduledForDate } from '../../lib/schedule'
import { ActivityCard } from '../ActivityCard'

interface DayViewProps {
  date: Date
  data: CalendarData
  onDataChange?: () => void
}

export function DayView({ date, data, onDataChange }: DayViewProps) {
  const key = toDateKey(date)
  const today = isToday(date)
  const completions = data.completions.get(key) || []
  const workoutLogs = data.workoutLogs.get(key) || []
  const activities = data.activities.get(key) || []
  const completedHabitIds = new Set(completions.map((c) => c.habitId))

  // Filter to only items scheduled for this day
  const scheduledHabits = data.habits.filter((h) => isScheduledForDate(h, date))
  const scheduledWorkouts = data.workouts.filter((w) => isScheduledForDate(w, date))

  const [pendingHabitToggles, setPendingHabitToggles] = useState<Set<number>>(new Set())
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

  // Individual exercise toggle
  const handleExerciseToggle = async (workoutId: number, exerciseIndex: number, totalExercises: number) => {
    await toggleExerciseInLog(workoutId, date, exerciseIndex, totalExercises)
    onDataChange?.()
  }

  // Get completed exercises for a workout from the log
  const getCompletedExercises = (workoutId: number): Set<number> => {
    const log = workoutLogs.find((l) => l.workoutId === workoutId)
    return new Set(log?.completedExercises || [])
  }

  const completedHabitCount = scheduledHabits.filter((h) => h.id != null && isHabitDone(h.id!)).length
  const completedWorkoutCount = scheduledWorkouts.filter((w) => {
    if (w.id == null || w.exercises.length === 0) return false
    const completed = getCompletedExercises(w.id)
    return w.exercises.every((_, i) => completed.has(i))
  }).length
  const totalItems = scheduledHabits.length + scheduledWorkouts.length
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
        {scheduledHabits.length > 0 && (
          <div className="border-b border-border dark:border-border-dark">
            <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Habits
            </h3>
            <ul>
              {scheduledHabits.map((habit) => {
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
        {scheduledWorkouts.length > 0 && (
          <div className="border-b border-border dark:border-border-dark">
            <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Workouts
            </h3>
            <ul>
              {scheduledWorkouts.map((workout) => {
                const wid = workout.id!
                const isExpanded = expandedWorkout === wid
                const completedExercises = getCompletedExercises(wid)
                const exDoneCount = workout.exercises.filter((_, i) => completedExercises.has(i)).length
                const allDone = workout.exercises.length > 0 && exDoneCount === workout.exercises.length

                return (
                  <li key={wid} className="border-t border-border dark:border-border-dark">
                    {/* Workout header row */}
                    <button
                      onClick={() => setExpandedWorkout(isExpanded ? null : wid)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm text-ink-light dark:text-gray-400">{workout.emoji}</span>
                      <span className={`flex-1 text-sm transition-colors ${
                        allDone ? 'text-muted line-through' : 'text-ink dark:text-gray-200'
                      }`}>
                        {workout.name}
                      </span>
                      <span className="text-[10px] text-muted">
                        {exDoneCount}/{workout.exercises.length}
                      </span>
                      <svg className={`h-3 w-3 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Exercises with individual checkboxes */}
                    {isExpanded && (
                      <div className="border-t border-border bg-background dark:border-border-dark dark:bg-background-dark">
                        <ul>
                          {workout.exercises.map((ex, i) => {
                            const exDone = completedExercises.has(i)
                            return (
                              <li key={i} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 dark:border-border-dark">
                                <button
                                  onClick={() => handleExerciseToggle(wid, i, workout.exercises.length)}
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all active:scale-90 ${
                                    exDone
                                      ? 'border-ink bg-ink text-paper dark:border-gray-400 dark:bg-gray-400 dark:text-gray-900'
                                      : 'border-border hover:border-ink-light dark:border-border-dark'
                                  }`}
                                >
                                  {exDone && (
                                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                                <span className={`flex-1 text-xs transition-colors ${
                                  exDone ? 'text-muted line-through' : 'text-ink-light dark:text-gray-300'
                                }`}>
                                  {ex.name}
                                </span>
                                <span className={`text-[10px] ${exDone ? 'text-muted/50' : 'text-muted'}`}>
                                  {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}${ex.unit || 'kg'}` : ''}
                                </span>
                              </li>
                            )
                          })}
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
        {scheduledHabits.length === 0 && scheduledWorkouts.length === 0 && (
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
            <div>
              {activities.map((activity) => (
                <ActivityCard key={activity.stravaId} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
