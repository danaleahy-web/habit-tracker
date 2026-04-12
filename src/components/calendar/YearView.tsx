import { useState } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import { getYearMonths, toDateKey, isToday, MONTH_NAMES_SHORT } from '../../lib/dates'

/**
 * Muted, journal-appropriate tones for habit heatmap rows.
 */
const HABIT_TONES = [
  { bg: 'bg-stone-500', hex: '#78716c', lightHex: '#e7e5e4' },
  { bg: 'bg-amber-700', hex: '#b45309', lightHex: '#fef3c7' },
  { bg: 'bg-emerald-700', hex: '#047857', lightHex: '#d1fae5' },
  { bg: 'bg-sky-700', hex: '#0369a1', lightHex: '#e0f2fe' },
  { bg: 'bg-violet-700', hex: '#6d28d9', lightHex: '#ede9fe' },
  { bg: 'bg-rose-700', hex: '#be123c', lightHex: '#ffe4e6' },
  { bg: 'bg-teal-700', hex: '#0f766e', lightHex: '#ccfbf1' },
  { bg: 'bg-orange-700', hex: '#c2410c', lightHex: '#ffedd5' },
]

/** Muted tones for different Strava activity types */
const ACTIVITY_TONES: Record<string, { hex: string; bg: string }> = {
  Run:            { hex: '#991b1b', bg: 'bg-red-800' },
  Ride:           { hex: '#1e40af', bg: 'bg-blue-800' },
  Swim:           { hex: '#155e75', bg: 'bg-cyan-800' },
  Walk:           { hex: '#166534', bg: 'bg-green-800' },
  Hike:           { hex: '#3f6212', bg: 'bg-lime-800' },
  WeightTraining: { hex: '#5b21b6', bg: 'bg-violet-800' },
  Yoga:           { hex: '#86198f', bg: 'bg-fuchsia-800' },
  Rowing:         { hex: '#115e59', bg: 'bg-teal-800' },
  Crossfit:       { hex: '#9a3412', bg: 'bg-orange-800' },
}
const DEFAULT_ACTIVITY_TONE = { hex: '#57534e', bg: 'bg-stone-600' }

interface YearViewProps {
  date: Date
  data: CalendarData
  onSelectDay: (date: Date) => void
}

export function YearView({ date, data, onSelectDay }: YearViewProps) {
  const year = date.getFullYear()
  const months = getYearMonths(year)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Habit → color index
  const habitColorMap = new Map<number, number>()
  data.habits.forEach((h, i) => {
    if (h.id != null) habitColorMap.set(h.id, i % HABIT_TONES.length)
  })

  // Per-habit completion day sets
  const habitDaySets = new Map<number, Set<string>>()
  for (const h of data.habits) {
    if (h.id != null) habitDaySets.set(h.id, new Set())
  }
  for (const [dayKey, completions] of data.completions) {
    for (const c of completions) {
      habitDaySets.get(c.habitId)?.add(dayKey)
    }
  }

  // Activity day sets grouped by type
  const activityTypeDays = new Map<string, Set<string>>()
  for (const [dayKey, activities] of data.activities) {
    for (const a of activities) {
      const t = a.type || 'Other'
      if (!activityTypeDays.has(t)) activityTypeDays.set(t, new Set())
      activityTypeDays.get(t)!.add(dayKey)
    }
  }
  const sortedActivityTypes = [...activityTypeDays.entries()].sort((a, b) => b[1].size - a[1].size)
  const hasActivities = sortedActivityTypes.length > 0

  return (
    <div className="space-y-2 px-3">
      {/* Habits */}
      {data.habits.length > 0 && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Habits</p>
      )}
      {data.habits.map((habit) => {
        const colorIdx = habitColorMap.get(habit.id!) ?? 0
        const tone = HABIT_TONES[colorIdx]
        const daySet = habitDaySets.get(habit.id!) || new Set()
        const rowKey = `habit-${habit.id}`
        return (
          <HeatmapRow key={rowKey}
            label={`${habit.emoji}  ${habit.name}`}
            hex={tone.hex} bg={tone.bg}
            daySet={daySet} months={months} year={year}
            expanded={expandedRow === rowKey}
            onToggle={() => setExpandedRow(expandedRow === rowKey ? null : rowKey)}
            onSelectDay={onSelectDay} />
        )
      })}

      {/* Activities */}
      {hasActivities && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted">Activities</p>
      )}
      {sortedActivityTypes.map(([actType, daySet]) => {
        const tone = ACTIVITY_TONES[actType] || DEFAULT_ACTIVITY_TONE
        const rowKey = `activity-${actType}`
        return (
          <HeatmapRow key={rowKey}
            label={actType}
            hex={tone.hex} bg={tone.bg}
            daySet={daySet} months={months} year={year}
            expanded={expandedRow === rowKey}
            onToggle={() => setExpandedRow(expandedRow === rowKey ? null : rowKey)}
            onSelectDay={onSelectDay} />
        )
      })}

      {/* Empty */}
      {data.habits.length === 0 && !hasActivities && (
        <div className="py-16 text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <p className="mt-6 text-sm text-ink-light dark:text-gray-400">No data for {year}</p>
          <p className="mt-1 text-xs text-muted">Create habits or sync Strava to see your year.</p>
        </div>
      )}
    </div>
  )
}

// ---- Heatmap Row ----

function HeatmapRow({ label, hex, bg, daySet, months, year, expanded, onToggle, onSelectDay }: {
  label: string; hex: string; bg: string
  daySet: Set<string>; months: Date[][]; year: number
  expanded: boolean; onToggle: () => void; onSelectDay: (d: Date) => void
}) {
  const count = daySet.size
  return (
    <div className="rounded-lg border border-border bg-paper dark:border-border-dark dark:bg-paper-dark">
      {/* Header */}
      <button onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: hex }} />
          <span className="text-sm font-medium text-ink dark:text-gray-200">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{count}d</span>
          <svg className={`h-3.5 w-3.5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Heatmap grid — 12 month columns */}
      <div className="px-3 pb-2.5">
        <div className="grid grid-cols-12 gap-1">
          {months.map((monthDays, mi) => {
            const firstDow = monthDays[0].getDay()
            return (
              <div key={mi} className="flex flex-col">
                <span className="mb-0.5 text-center text-[8px] font-medium text-muted">
                  {MONTH_NAMES_SHORT[mi].slice(0, 3)}
                </span>
                <div className="grid grid-cols-7 gap-[1.5px]">
                  {Array.from({ length: firstDow }).map((_, pi) => (
                    <div key={`p-${pi}`} />
                  ))}
                  {monthDays.map((day) => {
                    const key = toDateKey(day)
                    const active = daySet.has(key)
                    const today = isToday(day)
                    return (
                      <button key={key} onClick={() => onSelectDay(day)}
                        title={day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className={`aspect-square w-full rounded-[2px] ${
                          active ? bg : 'bg-background dark:bg-background-dark'
                        } ${today ? 'ring-1 ring-ink dark:ring-gray-400' : ''}`} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded: month grids + stats */}
      {expanded && (
        <div className="border-t border-border px-3 py-4 dark:border-border-dark">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {months.map((monthDays, mi) => {
              const firstDow = monthDays[0].getDay()
              const padded: (Date | null)[] = [...Array.from<null>({ length: firstDow }).fill(null), ...monthDays]
              const mCount = monthDays.filter((d) => daySet.has(toDateKey(d))).length
              return (
                <div key={mi}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-light dark:text-gray-300">{MONTH_NAMES_SHORT[mi]}</span>
                    <span className="text-[10px] text-muted">{mCount}d</span>
                  </div>
                  <div className="grid grid-cols-7 gap-[2px]">
                    {padded.map((day, i) => {
                      if (!day) return <div key={`p-${i}`} className="aspect-square" />
                      const k = toDateKey(day)
                      const active = daySet.has(k)
                      const today = isToday(day)
                      return (
                        <button key={k} onClick={() => onSelectDay(day)}
                          className={`aspect-square rounded-[2px] text-[7px] font-medium leading-none ${
                            active ? `${bg} text-white` : 'bg-background text-muted dark:bg-background-dark'
                          } ${today ? 'ring-1 ring-ink dark:ring-gray-400' : ''}`}>
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-3">
            <Stat label="Total" value={`${count}d`} />
            <Stat label="Current streak" value={`${streak(daySet, year, 'current')}d`} />
            <Stat label="Best streak" value={`${streak(daySet, year, 'best')}d`} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-md bg-background px-3 py-2 text-center dark:bg-background-dark">
      <p className="text-sm font-bold text-ink dark:text-gray-100">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  )
}

function streak(daySet: Set<string>, year: number, mode: 'current' | 'best'): number {
  if (mode === 'current') {
    let s = 0
    const d = new Date()
    while (d.getFullYear() === year) {
      if (daySet.has(toDateKey(d))) { s++; d.setDate(d.getDate() - 1) } else break
    }
    return s
  }
  let best = 0, cur = 0
  const d = new Date(year, 0, 1), end = new Date(year, 11, 31)
  while (d <= end) {
    if (daySet.has(toDateKey(d))) { cur++; if (cur > best) best = cur } else cur = 0
    d.setDate(d.getDate() + 1)
  }
  return best
}
