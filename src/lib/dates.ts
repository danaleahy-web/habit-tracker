/** Format a Date to "YYYY-MM-DD" in local time */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a "YYYY-MM-DD" string into a local Date at midnight */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Is this date today? */
export function isToday(d: Date): boolean {
  return toDateKey(d) === toDateKey(new Date())
}

/** Is this date in the same month/year as the reference? */
export function isSameMonth(d: Date, ref: Date): boolean {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

/** Get the start of the week (Sunday) containing this date */
export function startOfWeek(d: Date): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  result.setDate(result.getDate() - result.getDay())
  return result
}

/** Get the end of the week (Saturday) containing this date */
export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
}

/** Get the first day of the month */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Get the last day of the month */
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** Get all dates for a calendar month grid (includes padding days from prev/next month) */
export function getMonthGrid(d: Date): Date[] {
  const first = startOfMonth(d)
  const last = endOfMonth(d)
  const gridStart = startOfWeek(first)
  const gridEnd = endOfWeek(last)

  const days: Date[] = []
  const current = new Date(gridStart)
  while (current <= gridEnd) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/** Get the 7 dates for the week containing this date */
export function getWeekDays(d: Date): Date[] {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    return day
  })
}

/** Add N months to a date (clamped to last day of target month) */
export function addMonths(d: Date, n: number): Date {
  const result = new Date(d.getFullYear(), d.getMonth() + n, 1)
  result.setDate(Math.min(d.getDate(), endOfMonth(result).getDate()))
  return result
}

/** Add N days to a date */
export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

/** Format month heading: "April 2026" */
export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Format week heading: "Apr 7 – 13, 2026" */
export function formatWeekRange(d: Date): string {
  const start = startOfWeek(d)
  const end = endOfWeek(d)
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${end.getFullYear()}`
}

/** Format day heading: "Saturday, April 12" */
export function formatDayFull(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** Short day name: "Sun", "Mon", etc. */
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Short month names */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Get Jan 1 of the given year */
export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}

/** Get Dec 31 of the given year */
export function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31)
}

/** Get all dates in a calendar year, grouped by month (0-11) */
export function getYearMonths(year: number): Date[][] {
  const months: Date[][] = []
  for (let m = 0; m < 12; m++) {
    const days: Date[] = []
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, m, d))
    }
    months.push(days)
  }
  return months
}

/** Add N years to a date */
export function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate())
}
