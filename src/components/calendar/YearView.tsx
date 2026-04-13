import type { CalendarData } from '../../hooks/useCalendarData'
import { getYearMonths, toDateKey, isToday, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../../lib/dates'

interface YearViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function YearView({ date, data, onSelectDay }: YearViewProps) {
  const year = date.getFullYear()
  const months = getYearMonths(year)

  // Pre-compute day sets for calendar highlighting
  const completionDays = new Set<string>()
  for (const key of data.completions.keys()) completionDays.add(key)
  const workoutDays = new Set<string>()
  for (const key of data.workoutLogs.keys()) workoutDays.add(key)
  const activityDays = new Set<string>()
  for (const key of data.activities.keys()) activityDays.add(key)

  // Compute habit totals
  const habitTotals = data.habits.map((h) => {
    const days = new Set<string>()
    for (const [dayKey, completions] of data.completions) {
      if (completions.some((c) => c.habitId === h.id)) days.add(dayKey)
    }
    return { name: h.name, days: days.size }
  })

  // Compute workout totals
  const workoutTotals = data.workouts.map((w) => {
    let logged = 0
    for (const logs of data.workoutLogs.values()) {
      if (logs.some((l) => l.workoutId === w.id)) logged++
    }
    return { name: w.name, days: logged }
  })

  // Compute activity type totals
  const activityStats = new Map<string, { count: number; distance: number; duration: number }>()
  for (const activities of data.activities.values()) {
    for (const a of activities) {
      const t = a.type || 'Other'
      const existing = activityStats.get(t) || { count: 0, distance: 0, duration: 0 }
      existing.count++
      existing.distance += a.distanceMeters
      existing.duration += a.movingTimeSecs
      activityStats.set(t, existing)
    }
  }
  const sortedActivityStats = [...activityStats.entries()].sort((a, b) => b[1].count - a[1].count)

  // Overall totals
  const totalActiveDays = new Set([...completionDays, ...workoutDays, ...activityDays]).size

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Mini calendar grid */}
      <div className="grid grid-cols-2 gap-3 px-2 py-2 sm:grid-cols-3">
        {months.map((monthDays, mi) => {
          const firstDow = monthDays[0].getDay()
          const padded: (Date | null)[] = [
            ...Array.from<null>({ length: firstDow }).fill(null),
            ...monthDays,
          ]

          return (
            <div key={mi} className="rounded-lg border border-border bg-paper p-2 dark:border-border-dark dark:bg-paper-dark">
              <p className="mb-1.5 text-sm font-bold text-ink dark:text-gray-200">
                {MONTH_NAMES_SHORT[mi]}
              </p>
              <div className="mb-0.5 grid grid-cols-7 gap-[1px]">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="text-center text-[7px] font-semibold uppercase text-muted">{d[0]}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-[1px]">
                {padded.map((day, idx) => {
                  if (!day) return <div key={`p-${idx}`} className="aspect-square" />
                  const key = toDateKey(day)
                  const today = isToday(day)
                  const hasAnything = completionDays.has(key) || workoutDays.has(key) || activityDays.has(key)
                  return (
                    <button key={key} onClick={() => onSelectDay(day)}
                      className={`aspect-square rounded-[2px] text-[7px] font-medium leading-none ${
                        hasAnything ? 'bg-ink text-paper dark:bg-gray-400 dark:text-gray-900' : 'text-muted'
                      } ${today ? 'ring-1 ring-accent' : ''}`}>
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Year summary */}
      <div className="border-t border-border px-3 py-3 dark:border-border-dark">
        {/* Overall */}
        <div className="mb-4 text-center">
          <p className="text-2xl font-bold text-ink dark:text-gray-100">{totalActiveDays}</p>
          <p className="text-xs text-muted">active days in {year}</p>
        </div>

        {/* Habits */}
        {habitTotals.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Habits</p>
            <div className="space-y-1.5">
              {habitTotals.map((h, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-ink dark:text-gray-200">{h.name}</span>
                  <span className="text-sm font-semibold text-ink dark:text-gray-200">{h.days}d</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workouts */}
        {workoutTotals.length > 0 && (
          <div className="mb-3 border-t border-border pt-3 dark:border-border-dark">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Workouts</p>
            <div className="space-y-1.5">
              {workoutTotals.map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-ink dark:text-gray-200">{w.name}</span>
                  <span className="text-sm font-semibold text-ink dark:text-gray-200">{w.days}d</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        {sortedActivityStats.length > 0 && (
          <div className="border-t border-border pt-3 dark:border-border-dark">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Activities</p>
            <div className="space-y-1.5">
              {sortedActivityStats.map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-ink dark:text-gray-200">{type}</span>
                  <span className="text-right text-xs text-muted">
                    {stats.count}× · {formatDistance(stats.distance)} · {formatDuration(stats.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
