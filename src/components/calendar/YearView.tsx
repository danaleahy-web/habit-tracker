import { useState } from 'react'
import type { CalendarData } from '../../hooks/useCalendarData'
import { getYearMonths, toDateKey, isToday, MONTH_NAMES_SHORT } from '../../lib/dates'

const HABIT_TONES = [
  { bg: 'bg-stone-500', hex: '#78716c' },
  { bg: 'bg-amber-700', hex: '#b45309' },
  { bg: 'bg-emerald-700', hex: '#047857' },
  { bg: 'bg-sky-700', hex: '#0369a1' },
  { bg: 'bg-violet-700', hex: '#6d28d9' },
  { bg: 'bg-rose-700', hex: '#be123c' },
  { bg: 'bg-teal-700', hex: '#0f766e' },
  { bg: 'bg-orange-700', hex: '#c2410c' },
]

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

  const habitColorMap = new Map<number, number>()
  data.habits.forEach((h, i) => {
    if (h.id != null) habitColorMap.set(h.id, i % HABIT_TONES.length)
  })

  const habitDaySets = new Map<number, Set<string>>()
  for (const h of data.habits) {
    if (h.id != null) habitDaySets.set(h.id, new Set())
  }
  for (const [dayKey, completions] of data.completions) {
    for (const c of completions) {
      habitDaySets.get(c.habitId)?.add(dayKey)
    }
  }

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

  // Build all rows for equal-height distribution
  const allRows: { key: string; label: string; hex: string; bg: string; daySet: Set<string>; section?: string }[] = []

  if (data.habits.length > 0) {
    allRows.push({ key: 'section-habits', label: '', hex: '', bg: '', daySet: new Set(), section: 'Habits' })
    for (const habit of data.habits) {
      const colorIdx = habitColorMap.get(habit.id!) ?? 0
      const tone = HABIT_TONES[colorIdx]
      allRows.push({
        key: `habit-${habit.id}`,
        label: habit.name,
        hex: tone.hex, bg: tone.bg,
        daySet: habitDaySets.get(habit.id!) || new Set(),
      })
    }
  }

  if (hasActivities) {
    allRows.push({ key: 'section-activities', label: '', hex: '', bg: '', daySet: new Set(), section: 'Activities' })
    for (const [actType, daySet] of sortedActivityTypes) {
      const tone = ACTIVITY_TONES[actType] || DEFAULT_ACTIVITY_TONE
      allRows.push({ key: `activity-${actType}`, label: actType, hex: tone.hex, bg: tone.bg, daySet })
    }
  }

  if (allRows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <p className="mt-4 text-sm text-ink-light dark:text-gray-400">No data for {year}</p>
          <p className="mt-1 text-xs text-muted">Create habits or sync Strava to see your year.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {allRows.map((row, i) => {
        const isLast = i === allRows.length - 1

        // Section header
        if (row.section) {
          return (
            <div key={row.key}
              className={`border-b border-border px-3 py-1.5 dark:border-border-dark ${i > 0 ? 'border-t' : ''}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{row.section}</p>
            </div>
          )
        }

        const isExpanded = expandedRow === row.key
        const count = row.daySet.size

        return (
          <div key={row.key}
            className={`flex flex-col ${!isLast ? 'border-b border-border dark:border-border-dark' : ''} ${
              isExpanded ? '' : 'flex-1'
            }`}>
            {/* Row header + heatmap */}
            <button onClick={() => setExpandedRow(isExpanded ? null : row.key)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
              <span className="block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: row.hex }} />
              <span className="flex-1 truncate text-xs font-medium text-ink dark:text-gray-200">{row.label}</span>
              <span className="text-[10px] text-muted">{count}d</span>
              <svg className={`h-3 w-3 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Compact heatmap */}
            <div className="flex-1 px-2 pb-1">
              <div className="grid h-full grid-cols-12 gap-0.5">
                {months.map((monthDays, mi) => {
                  const firstDow = monthDays[0].getDay()
                  return (
                    <div key={mi} className="flex flex-col">
                      <span className="mb-0.5 text-center text-[7px] font-medium text-muted">
                        {MONTH_NAMES_SHORT[mi][0]}
                      </span>
                      <div className="grid flex-1 grid-cols-7 gap-[1px]">
                        {Array.from({ length: firstDow }).map((_, pi) => (
                          <div key={`p-${pi}`} />
                        ))}
                        {monthDays.map((day) => {
                          const key = toDateKey(day)
                          const active = row.daySet.has(key)
                          const today = isToday(day)
                          return (
                            <button key={key} onClick={(e) => { e.stopPropagation(); onSelectDay(day) }}
                              className={`aspect-square w-full rounded-[1px] ${
                                active ? row.bg : 'bg-border/40 dark:bg-border-dark/60'
                              } ${today ? 'ring-1 ring-ink dark:ring-gray-400' : ''}`} />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-border px-3 py-3 dark:border-border-dark">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {months.map((monthDays, mi) => {
                    const firstDow = monthDays[0].getDay()
                    const padded: (Date | null)[] = [...Array.from<null>({ length: firstDow }).fill(null), ...monthDays]
                    const mCount = monthDays.filter((d) => row.daySet.has(toDateKey(d))).length
                    return (
                      <div key={mi}>
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-ink-light dark:text-gray-300">{MONTH_NAMES_SHORT[mi]}</span>
                          <span className="text-[9px] text-muted">{mCount}d</span>
                        </div>
                        <div className="grid grid-cols-7 gap-[1.5px]">
                          {padded.map((day, idx) => {
                            if (!day) return <div key={`p-${idx}`} className="aspect-square" />
                            const k = toDateKey(day)
                            const active = row.daySet.has(k)
                            const today = isToday(day)
                            return (
                              <button key={k} onClick={() => onSelectDay(day)}
                                className={`aspect-square rounded-[1.5px] text-[6px] font-medium leading-none ${
                                  active ? `${row.bg} text-white` : 'bg-background text-muted dark:bg-background-dark'
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
                <div className="mt-3 flex gap-2">
                  <Stat label="Total" value={`${count}d`} />
                  <Stat label="Current" value={`${streak(row.daySet, year, 'current')}d`} />
                  <Stat label="Best" value={`${streak(row.daySet, year, 'best')}d`} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-md bg-background px-2 py-1.5 text-center dark:bg-background-dark">
      <p className="text-sm font-bold text-ink dark:text-gray-100">{value}</p>
      <p className="text-[9px] text-muted">{label}</p>
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
