import type { CalendarData } from '../../hooks/useCalendarData'
import { toDateKey, MONTH_NAMES_SHORT } from '../../lib/dates'

interface YearViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

function fmtDist(m: number): string {
  const km = m / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(m)} m`
}

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function fmtPace(meters: number, secs: number): string {
  if (meters === 0) return '—'
  const p = secs / (meters / 1000)
  const m = Math.floor(p / 60)
  const s = Math.round(p % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

export function YearView({ date, data }: YearViewProps) {
  const year = date.getFullYear()

  // ---- Compute all stats ----

  // Active days
  const allDays = new Set([
    ...data.completions.keys(),
    ...data.workoutLogs.keys(),
    ...data.activities.keys(),
  ])
  const totalActiveDays = allDays.size
  const totalDaysInYear = (year === new Date().getFullYear())
    ? Math.floor((Date.now() - new Date(year, 0, 1).getTime()) / 86400000) + 1
    : (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1

  // Habit stats
  const habitStats = data.habits.map((h) => {
    const days = new Set<string>()
    for (const [dayKey, completions] of data.completions) {
      if (completions.some((c) => c.habitId === h.id)) days.add(dayKey)
    }
    // Streak
    let currentStreak = 0
    const d = new Date()
    while (d.getFullYear() === year) {
      if (days.has(toDateKey(d))) { currentStreak++; d.setDate(d.getDate() - 1) } else break
    }
    let bestStreak = 0, run = 0
    const s = new Date(year, 0, 1), e = new Date(year, 11, 31)
    while (s <= e) {
      if (days.has(toDateKey(s))) { run++; if (run > bestStreak) bestStreak = run } else run = 0
      s.setDate(s.getDate() + 1)
    }
    return { name: h.name, days: days.size, currentStreak, bestStreak }
  }).sort((a, b) => b.days - a.days)

  // Workout stats
  const workoutStats = data.workouts.map((w) => {
    let logged = 0
    for (const logs of data.workoutLogs.values()) {
      if (logs.some((l) => l.workoutId === w.id)) logged++
    }
    return { name: w.name, days: logged }
  }).sort((a, b) => b.days - a.days)

  // Activity type stats
  const actTypeStats = new Map<string, { count: number; distance: number; duration: number }>()
  let totalDistance = 0, totalDuration = 0, totalActivityCount = 0
  for (const activities of data.activities.values()) {
    for (const a of activities) {
      const t = a.type || 'Other'
      const s = actTypeStats.get(t) || { count: 0, distance: 0, duration: 0 }
      s.count++; s.distance += a.distanceMeters; s.duration += a.movingTimeSecs
      actTypeStats.set(t, s)
      totalDistance += a.distanceMeters
      totalDuration += a.movingTimeSecs
      totalActivityCount++
    }
  }
  const sortedActTypes = [...actTypeStats.entries()].sort((a, b) => b[1].count - a[1].count)

  // Monthly activity breakdown (for bar chart)
  const monthlyActivity = Array.from({ length: 12 }, (_, mi) => {
    let count = 0
    const prefix = `${year}-${String(mi + 1).padStart(2, '0')}`
    for (const key of allDays) {
      if (key.startsWith(prefix)) count++
    }
    return count
  })
  const maxMonthly = Math.max(...monthlyActivity, 1)

  // Best month
  const bestMonthIdx = monthlyActivity.indexOf(Math.max(...monthlyActivity))

  // Day of week distribution
  const dowCounts = [0, 0, 0, 0, 0, 0, 0]
  const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (const key of allDays) {
    const d = new Date(key + 'T12:00:00')
    dowCounts[d.getDay()]++
  }
  const maxDow = Math.max(...dowCounts, 1)
  const bestDowIdx = dowCounts.indexOf(Math.max(...dowCounts))

  const hasData = totalActiveDays > 0 || habitStats.length > 0

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <p className="mt-4 text-sm text-ink-light dark:text-gray-400">No data for {year}</p>
          <p className="mt-1 text-xs text-muted">Start tracking to see your year in review.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-6 px-4 py-4">

        {/* Hero stat */}
        <div className="text-center">
          <p className="text-4xl font-bold text-ink dark:text-gray-100">{totalActiveDays}</p>
          <p className="mt-1 text-sm text-muted">
            active days out of {totalDaysInYear} in {year}
          </p>
          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-border dark:bg-border-dark">
            <div className="h-full rounded-full bg-ink dark:bg-gray-400"
              style={{ width: `${Math.round((totalActiveDays / totalDaysInYear) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {Math.round((totalActiveDays / totalDaysInYear) * 100)}% of the year
          </p>
        </div>

        {/* Monthly activity bar chart */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Month by month</p>
          <div className="flex items-end gap-1">
            {monthlyActivity.map((count, mi) => (
              <div key={mi} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] font-semibold text-muted">{count || ''}</span>
                <div className="flex w-full flex-col justify-end rounded-sm bg-border dark:bg-border-dark" style={{ height: '80px' }}>
                  <div className={`w-full rounded-sm ${mi === bestMonthIdx ? 'bg-accent' : 'bg-ink dark:bg-gray-400'}`}
                    style={{ height: `${Math.max(count > 0 ? 4 : 0, (count / maxMonthly) * 100)}%` }} />
                </div>
                <span className="text-[8px] text-muted">{MONTH_NAMES_SHORT[mi][0]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Most active month: <span className="font-semibold text-ink dark:text-gray-200">{MONTH_NAMES_SHORT[bestMonthIdx]}</span>
          </p>
        </div>

        {/* Day of week distribution */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Most active days</p>
          <div className="space-y-1.5">
            {DOW_NAMES.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 text-xs text-muted">{name}</span>
                <div className="flex-1 overflow-hidden rounded-sm bg-border dark:bg-border-dark" style={{ height: '12px' }}>
                  <div className={`h-full rounded-sm ${i === bestDowIdx ? 'bg-accent' : 'bg-ink dark:bg-gray-400'}`}
                    style={{ width: `${(dowCounts[i] / maxDow) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-muted">{dowCounts[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            You're most active on <span className="font-semibold text-ink dark:text-gray-200">{DOW_NAMES[bestDowIdx]}s</span>
          </p>
        </div>

        {/* Habits */}
        {habitStats.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Habits</p>
            <div className="space-y-3">
              {habitStats.map((h, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink dark:text-gray-200">{h.name}</span>
                    <span className="text-sm font-bold text-ink dark:text-gray-200">{h.days}d</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    <span>Current streak: {h.currentStreak}d</span>
                    <span>Best: {h.bestStreak}d</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border dark:bg-border-dark">
                    <div className="h-full rounded-full bg-ink dark:bg-gray-400"
                      style={{ width: `${Math.min(100, (h.days / totalDaysInYear) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workouts */}
        {workoutStats.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Workouts</p>
            <div className="space-y-3">
              {workoutStats.map((w, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink dark:text-gray-200">{w.name}</span>
                    <span className="text-sm font-bold text-ink dark:text-gray-200">{w.days} sessions</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border dark:bg-border-dark">
                    <div className="h-full rounded-full bg-ink dark:bg-gray-400"
                      style={{ width: `${Math.min(100, (w.days / totalDaysInYear) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strava activities */}
        {sortedActTypes.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Activities</p>

            {/* Big numbers */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-background px-3 py-2.5 text-center dark:bg-background-dark">
                <p className="text-lg font-bold text-ink dark:text-gray-100">{totalActivityCount}</p>
                <p className="text-[10px] text-muted">total</p>
              </div>
              <div className="rounded-lg bg-background px-3 py-2.5 text-center dark:bg-background-dark">
                <p className="text-lg font-bold text-ink dark:text-gray-100">{fmtDist(totalDistance)}</p>
                <p className="text-[10px] text-muted">distance</p>
              </div>
              <div className="rounded-lg bg-background px-3 py-2.5 text-center dark:bg-background-dark">
                <p className="text-lg font-bold text-ink dark:text-gray-100">{fmtDur(totalDuration)}</p>
                <p className="text-[10px] text-muted">moving time</p>
              </div>
            </div>

            {/* Per type */}
            <div className="space-y-3">
              {sortedActTypes.map(([type, stats]) => (
                <div key={type} className="border-b border-border pb-3 last:border-0 dark:border-border-dark">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink dark:text-gray-200">{type}</span>
                    <span className="text-sm font-bold text-ink dark:text-gray-200">{stats.count}×</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    <span>{fmtDist(stats.distance)}</span>
                    <span>{fmtDur(stats.duration)}</span>
                    {stats.distance > 0 && <span>{fmtPace(stats.distance, stats.duration)} avg</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
