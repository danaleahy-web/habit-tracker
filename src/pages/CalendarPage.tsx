import { useState, useCallback } from 'react'
import { useCalendarData } from '../hooks/useCalendarData'
import { MonthView } from '../components/calendar/MonthView'
import { WeekView } from '../components/calendar/WeekView'
import { DayView } from '../components/calendar/DayView'
import { YearView } from '../components/calendar/YearView'
import {
  startOfWeek, endOfWeek, startOfYear, endOfYear,
  addMonths, addDays, addYears,
  formatMonthYear, formatWeekRange, formatDayFull, getMonthGrid,
} from '../lib/dates'

type ViewMode = 'day' | 'week' | 'month' | 'year'
const VIEW_MODES: ViewMode[] = ['day', 'week', 'month', 'year']

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [refreshKey, setRefreshKey] = useState(0)

  const { rangeStart, rangeEnd } = computeRange(viewMode, selectedDate)
  const data = useCalendarData(rangeStart, rangeEnd, refreshKey)

  const handleDataChange = useCallback(() => setRefreshKey((k) => k + 1), [])

  const goBack = useCallback(() => {
    setSelectedDate((d) => {
      if (viewMode === 'year') return addYears(d, -1)
      if (viewMode === 'month') return addMonths(d, -1)
      if (viewMode === 'week') return addDays(d, -7)
      return addDays(d, -1)
    })
  }, [viewMode])

  const goForward = useCallback(() => {
    setSelectedDate((d) => {
      if (viewMode === 'year') return addYears(d, 1)
      if (viewMode === 'month') return addMonths(d, 1)
      if (viewMode === 'week') return addDays(d, 7)
      return addDays(d, 1)
    })
  }, [viewMode])

  const goToday = useCallback(() => setSelectedDate(new Date()), [])

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(date)
    setViewMode('day')
  }, [])

  const heading =
    viewMode === 'year' ? String(selectedDate.getFullYear())
    : viewMode === 'month' ? formatMonthYear(selectedDate)
    : viewMode === 'week' ? formatWeekRange(selectedDate)
    : formatDayFull(selectedDate)

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-background px-3 pb-1.5 pt-3 dark:bg-background-dark">
        {/* View toggle */}
        <div className="mx-auto flex rounded-md border border-border p-0.5 dark:border-border-dark">
          {VIEW_MODES.map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex-1 rounded-[4px] py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                viewMode === mode
                  ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                  : 'text-muted hover:text-ink dark:hover:text-gray-300'
              }`}>
              {mode}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-2 flex items-center justify-between">
          <button onClick={goBack} aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-ink dark:text-gray-100">{heading}</h1>
          <button onClick={goForward} aria-label="Next"
            className="flex h-7 w-7 items-center justify-center rounded text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-2">
        {/* Floating Today button */}
        <button onClick={goToday}
          className="fixed bottom-14 right-3 z-50 rounded-md border border-border bg-paper px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink shadow-sm transition-all active:scale-95 dark:border-border-dark dark:bg-paper-dark dark:text-gray-200">
          Today
        </button>

        {data.loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        ) : viewMode === 'year' ? (
          <YearView date={selectedDate} data={data} onSelectDay={handleSelectDay} />
        ) : viewMode === 'month' ? (
          <MonthView date={selectedDate} data={data} onSelectDay={handleSelectDay} />
        ) : viewMode === 'week' ? (
          <WeekView date={selectedDate} data={data} onSelectDay={handleSelectDay} />
        ) : (
          <DayView date={selectedDate} data={data} onDataChange={handleDataChange} />
        )}
      </div>
    </div>
  )
}

function computeRange(mode: ViewMode, date: Date) {
  if (mode === 'year') return { rangeStart: startOfYear(date), rangeEnd: endOfYear(date) }
  if (mode === 'month') { const g = getMonthGrid(date); return { rangeStart: g[0], rangeEnd: g[g.length - 1] } }
  if (mode === 'week') return { rangeStart: startOfWeek(date), rangeEnd: endOfWeek(date) }
  return { rangeStart: date, rangeEnd: date }
}
