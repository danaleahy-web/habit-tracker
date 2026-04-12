import { useState } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import type { Habit } from '../../db/index'
import { toggleCompletion } from '../../db/habits'
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
  const activities = data.activities.get(key) || []
  const completedHabitIds = new Set(completions.map((c) => c.habitId))

  const [pendingToggles, setPendingToggles] = useState<Set<number>>(new Set())

  const habitMap = new Map<number, Habit>()
  for (const h of data.habits) {
    if (h.id != null) habitMap.set(h.id, h)
  }

  const handleToggle = async (habitId: number) => {
    if (pendingToggles.has(habitId)) return
    setPendingToggles((prev) => new Set(prev).add(habitId))
    try {
      await toggleCompletion(habitId, date)
      onDataChange?.()
    } finally {
      setPendingToggles((prev) => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  const isCompleted = (habitId: number) => {
    const dbState = completedHabitIds.has(habitId)
    return pendingToggles.has(habitId) ? !dbState : dbState
  }

  const completedCount = data.habits.filter((h) => h.id != null && isCompleted(h.id!)).length

  return (
    <div className="space-y-4 px-3">
      {/* Date heading */}
      <div className="border-b border-border px-1 pb-3 dark:border-border-dark">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          {today ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
        </p>
        <h2 className="mt-0.5 text-xl font-bold text-ink dark:text-gray-100">
          {formatDayFull(date)}
        </h2>
      </div>

      {/* Habits checklist */}
      <div>
        <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Habits
        </h3>

        {data.habits.length === 0 ? (
          <div className="px-1 py-8 text-center">
            <p className="text-sm text-muted">No habits created yet.</p>
            <p className="mt-1 text-xs text-muted">Head to the Plan tab to add some.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border dark:divide-border-dark">
              {data.habits.map((habit) => {
                const done = habit.id != null && isCompleted(habit.id)
                const toggling = habit.id != null && pendingToggles.has(habit.id)
                return (
                  <li key={habit.id} className="flex items-center gap-3 px-1 py-2.5">
                    <button
                      onClick={() => habit.id != null && handleToggle(habit.id)}
                      disabled={toggling}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                        done
                          ? 'border-ink bg-ink text-paper dark:border-gray-400 dark:bg-gray-400 dark:text-gray-900'
                          : 'border-border hover:border-ink-light dark:border-border-dark dark:hover:border-gray-500'
                      } ${toggling ? 'opacity-50' : 'active:scale-90'}`}
                      aria-label={`Mark ${habit.name} as ${done ? 'incomplete' : 'complete'}`}
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

            {/* Progress */}
            <div className="mt-3 px-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">{completedCount} of {data.habits.length}</span>
                <span className="font-semibold text-ink-light dark:text-gray-400">
                  {Math.round((completedCount / data.habits.length) * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border dark:bg-border-dark">
                <div
                  className="h-full rounded-full bg-ink transition-all duration-300 dark:bg-gray-400"
                  style={{ width: `${(completedCount / data.habits.length) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Activities */}
      <div>
        <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Activities
        </h3>

        {activities.length === 0 ? (
          <div className="px-1 py-8 text-center">
            <p className="text-sm text-muted">No activities on this day.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border dark:divide-border-dark">
            {activities.map((activity) => (
              <li key={activity.stravaId} className="px-1 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink dark:text-gray-100">
                    {activity.name}
                  </span>
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
  )
}
