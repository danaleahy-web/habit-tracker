import { toDateKey } from './dates'

interface Schedulable {
  scheduledDays?: number[]
  frequencyPerWeek?: number
  startDate?: Date
  endDate?: Date
  createdAt: Date
}

/**
 * Check if a schedulable item (habit or workout) should appear on a given date.
 *
 * Rules:
 * 1. Date must be ≥ startDate (or createdAt if no startDate)
 * 2. Date must be ≤ endDate (if set)
 * 3. If scheduledDays has entries → date's day-of-week must be in the array
 * 4. If no scheduledDays (flexible) → always show (user picks which days)
 */
export function isScheduledForDate(item: Schedulable, date: Date): boolean {
  const dateKey = toDateKey(date)

  // Check start boundary
  const effectiveStart = item.startDate || item.createdAt
  if (effectiveStart && toDateKey(effectiveStart) > dateKey) {
    return false
  }

  // Check end boundary
  if (item.endDate && toDateKey(item.endDate) < dateKey) {
    return false
  }

  // Check day-of-week
  if (item.scheduledDays && item.scheduledDays.length > 0) {
    const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
    return item.scheduledDays.includes(dayOfWeek)
  }

  // Flexible or no scheduling → show every day
  return true
}

/**
 * Format a human-readable schedule description.
 */
export function formatSchedule(item: Schedulable): string {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const parts: string[] = []

  // Days
  if (item.scheduledDays && item.scheduledDays.length > 0) {
    if (item.scheduledDays.length === 7) {
      parts.push('Every day')
    } else {
      parts.push(item.scheduledDays.map((d) => DAY_NAMES[d]).join(', '))
    }
  } else if (item.frequencyPerWeek) {
    if (item.frequencyPerWeek === 7) {
      parts.push('Every day')
    } else {
      parts.push(`${item.frequencyPerWeek}× / week`)
    }
  }

  // Period
  const start = item.startDate
  const end = item.endDate
  if (start || end) {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (start && end) {
      parts.push(`${fmt(start)} – ${fmt(end)}`)
    } else if (start) {
      parts.push(`From ${fmt(start)}`)
    } else if (end) {
      parts.push(`Until ${fmt(end)}`)
    }
  }

  return parts.join(' · ') || 'Every day'
}
