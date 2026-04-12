import { useState, useRef } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import { toggleCompletion } from '../../db/habits'
import { toggleExerciseInLog, addExtraExercise, removeExtraExercise, toggleExtraExercise } from '../../db/workouts'
import type { Exercise } from '../../db/index'
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
  const expandedWorkoutRef = useRef<number | null>(null)
  const [, forceRender] = useState(0)
  const expandedWorkout = expandedWorkoutRef.current
  const setExpandedWorkout = (v: number | null) => {
    expandedWorkoutRef.current = v
    forceRender((n) => n + 1)
  }
  const [addingExtraFor, setAddingExtraFor] = useState<number | null>(null)
  const [extraName, setExtraName] = useState('')
  const [extraSets, setExtraSets] = useState(3)
  const [extraReps, setExtraReps] = useState(10)

  // Habit toggle
  const handleHabitToggle = async (habitId: number) => {
    if (pendingHabitToggles.has(habitId)) return
    setPendingHabitToggles((prev) => new Set(prev).add(habitId))
    try { await toggleCompletion(habitId, date) }
    finally { setPendingHabitToggles((prev) => { const n = new Set(prev); n.delete(habitId); return n }) }
  }

  const isHabitDone = (habitId: number) => {
    const dbState = completedHabitIds.has(habitId)
    return pendingHabitToggles.has(habitId) ? !dbState : dbState
  }

  // Local optimistic state for exercise toggles (avoids re-render that collapses the workout)
  const [localExOverrides, setLocalExOverrides] = useState<Map<string, Set<number>>>(new Map())

  // Get completed exercises: merge DB state with local optimistic overrides
  const getCompletedExercises = (workoutId: number): Set<number> => {
    const overrideKey = `${workoutId}`
    const override = localExOverrides.get(overrideKey)
    if (override) return override
    const log = workoutLogs.find((l) => l.workoutId === workoutId)
    return new Set(log?.completedExercises || [])
  }

  // Get extra exercises and their completion state
  const getExtras = (workoutId: number) => {
    const log = workoutLogs.find((l) => l.workoutId === workoutId)
    return {
      exercises: log?.extraExercises || [],
      completed: new Set(log?.completedExtras || []),
    }
  }

  const handleAddExtra = async (workoutId: number) => {
    if (!extraName.trim()) return
    const ex: Exercise = { name: extraName.trim(), sets: extraSets, reps: extraReps }
    await addExtraExercise(workoutId, date, ex)
    setAddingExtraFor(null)
    setExtraName(''); setExtraSets(3); setExtraReps(10)
    onDataChange?.() // reload to show the new exercise
  }

  // Optimistic local state for extra exercise toggles
  const [localExtraOverrides, setLocalExtraOverrides] = useState<Map<string, Set<number>>>(new Map())

  const getExtrasCompleted = (workoutId: number, dbCompleted: Set<number>): Set<number> => {
    const override = localExtraOverrides.get(`${workoutId}`)
    return override ?? dbCompleted
  }

  const handleToggleExtra = async (workoutId: number, extraIndex: number) => {
    const key = `${workoutId}`
    const extras = getExtras(workoutId)
    const current = getExtrasCompleted(workoutId, extras.completed)
    const next = new Set(current)
    next.has(extraIndex) ? next.delete(extraIndex) : next.add(extraIndex)
    setLocalExtraOverrides((prev) => new Map(prev).set(key, next))
    await toggleExtraExercise(workoutId, date, extraIndex)
  }

  const handleRemoveExtra = async (workoutId: number, extraIndex: number) => {
    await removeExtraExercise(workoutId, date, extraIndex)
    onDataChange?.()
  }

  // Individual exercise toggle — optimistic local update, DB write in background
  const handleExerciseToggle = async (workoutId: number, exerciseIndex: number, totalExercises: number) => {
    const key = `${workoutId}`
    const current = getCompletedExercises(workoutId)
    const next = new Set(current)
    next.has(exerciseIndex) ? next.delete(exerciseIndex) : next.add(exerciseIndex)

    // Optimistic update
    setLocalExOverrides((prev) => new Map(prev).set(key, next))

    // Persist to DB, debounce sync to other views
    await toggleExerciseInLog(workoutId, date, exerciseIndex, totalExercises)
  }

  const completedHabitCount = scheduledHabits.filter((h) => h.id != null && isHabitDone(h.id!)).length
  const completedWorkoutCount = scheduledWorkouts.filter((w) => {
    if (w.id == null) return false
    const completed = getCompletedExercises(w.id)
    const extras = getExtras(w.id)
    const totalEx = w.exercises.length + extras.exercises.length
    if (totalEx === 0) return false
    const doneCount = w.exercises.filter((_, i) => completed.has(i)).length +
      extras.exercises.filter((_, i) => getExtrasCompleted(w.id!, extras.completed).has(i)).length
    return doneCount === totalEx
  }).length
  const totalItems = scheduledHabits.length + scheduledWorkouts.length
  const totalCompleted = completedHabitCount + completedWorkoutCount

  return (
    <div className="flex h-full flex-col">
      {/* Date heading */}
      <div className="border-b border-border px-4 pb-2 dark:border-border-dark">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
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
            <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-muted">
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
                    <span className={`flex-1 text-base transition-colors ${
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
            <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-muted">
              Workouts
            </h3>
            <ul>
              {scheduledWorkouts.map((workout) => {
                const wid = workout.id!
                const isExpanded = expandedWorkout === wid
                const completedExercises = getCompletedExercises(wid)
                const extras = getExtras(wid)
                const totalEx = workout.exercises.length + extras.exercises.length
                const extrasCompleted = getExtrasCompleted(wid, extras.completed)
                const doneCount = workout.exercises.filter((_, i) => completedExercises.has(i)).length +
                  extras.exercises.filter((_, i) => extrasCompleted.has(i)).length
                const allDone = totalEx > 0 && doneCount === totalEx

                return (
                  <li key={wid} className="border-t border-border dark:border-border-dark">
                    {/* Workout header */}
                    <button onClick={() => setExpandedWorkout(isExpanded ? null : wid)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className={`flex-1 text-sm transition-colors ${allDone ? 'text-muted line-through' : 'text-ink dark:text-gray-200'}`}>
                        {workout.name}
                      </span>
                      <span className="text-xs text-muted">{doneCount}/{totalEx}</span>
                      <svg className={`h-3 w-3 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Exercises */}
                    {isExpanded && (
                      <div className="border-t border-border bg-background dark:border-border-dark dark:bg-background-dark">
                        {/* Template exercises */}
                        <ul>
                          {workout.exercises.map((ex, i) => {
                            const exDone = completedExercises.has(i)
                            return (
                              <ExerciseRow key={`t-${i}`} name={ex.name}
                                detail={`${ex.sets}×${ex.reps}${ex.weight ? ` · ${ex.weight}${ex.unit || 'kg'}` : ''}`}
                                done={exDone}
                                onToggle={() => handleExerciseToggle(wid, i, workout.exercises.length)} />
                            )
                          })}
                        </ul>

                        {/* Extra exercises (day-specific) */}
                        {extras.exercises.length > 0 && (
                          <div className="border-t border-border dark:border-border-dark">
                            <p className="px-4 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Today only</p>
                            <ul>
                              {extras.exercises.map((ex, i) => (
                                <ExerciseRow key={`e-${i}`} name={ex.name}
                                  detail={`${ex.sets}×${ex.reps}${ex.weight ? ` · ${ex.weight}${ex.unit || 'kg'}` : ''}`}
                                  done={extrasCompleted.has(i)}
                                  onToggle={() => handleToggleExtra(wid, i)}
                                  onRemove={() => handleRemoveExtra(wid, i)} />
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Add extra exercise */}
                        {addingExtraFor === wid ? (
                          <div className="border-t border-border px-4 py-2.5 dark:border-border-dark">
                            <div className="flex gap-2">
                              <input type="text" value={extraName} onChange={(e) => setExtraName(e.target.value)}
                                placeholder="Exercise name" autoFocus
                                className="flex-1 rounded-md border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
                              <input type="number" min={1} value={extraSets} onChange={(e) => setExtraSets(parseInt(e.target.value) || 1)}
                                className="w-12 rounded-md border border-border bg-paper px-1 py-1.5 text-center text-xs text-ink outline-none dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
                                placeholder="Sets" />
                              <input type="number" min={1} value={extraReps} onChange={(e) => setExtraReps(parseInt(e.target.value) || 1)}
                                className="w-12 rounded-md border border-border bg-paper px-1 py-1.5 text-center text-xs text-ink outline-none dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
                                placeholder="Reps" />
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button onClick={() => handleAddExtra(wid)} disabled={!extraName.trim()}
                                className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40 dark:bg-gray-200 dark:text-gray-900">
                                Add
                              </button>
                              <button onClick={() => setAddingExtraFor(null)} className="text-xs text-muted">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingExtraFor(wid); setExtraName(''); setExtraSets(3); setExtraReps(10) }}
                            className="w-full border-t border-border px-4 py-2 text-left text-xs text-accent underline-offset-2 hover:underline dark:border-border-dark">
                            + Add exercise for today
                          </button>
                        )}
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
            <div className="flex items-center justify-between text-xs">
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
          <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-muted">
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

/** Reusable exercise row with checkbox */
function ExerciseRow({ name, detail, done, onToggle, onRemove }: {
  name: string; detail: string; done: boolean
  onToggle: () => void; onRemove?: () => void
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 dark:border-border-dark">
      <button onClick={onToggle}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all active:scale-90 ${
          done
            ? 'border-ink bg-ink text-paper dark:border-gray-400 dark:bg-gray-400 dark:text-gray-900'
            : 'border-border hover:border-ink-light dark:border-border-dark'
        }`}>
        {done && (
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm transition-colors ${done ? 'text-muted line-through' : 'text-ink-light dark:text-gray-300'}`}>
        {name}
      </span>
      <span className={`text-[10px] ${done ? 'text-muted/50' : 'text-muted'}`}>{detail}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">×</button>
      )}
    </li>
  )
}
