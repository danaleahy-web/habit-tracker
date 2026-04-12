import { useState, useEffect } from 'react'
import type { Habit } from '../db/index'
import { toDateKey } from '../lib/dates'

const ICON_OPTIONS = [
  '●', '○', '◆', '◇', '■', '□', '▲', '△',
  '★', '☆', '✦', '✧', '◉', '◎', '▪', '▫',
  '⬡', '⬢', '◈', '✕', '⊕', '⊗', '⊙', '◬',
]

const FLEX_FREQUENCY_OPTIONS = [
  { value: 7, label: 'Daily' },
  { value: 6, label: '6×' },
  { value: 5, label: '5×' },
  { value: 4, label: '4×' },
  { value: 3, label: '3×' },
  { value: 2, label: '2×' },
  { value: 1, label: '1×' },
]

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type ScheduleMode = 'specific' | 'flexible'

export interface HabitFormData {
  name: string
  emoji: string
  frequencyPerWeek: number
  scheduledDays?: number[]
  startDate?: Date
  endDate?: Date
}

interface HabitFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: HabitFormData) => void
  habit?: Habit
}

export function HabitFormModal({ open, onClose, onSave, habit }: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('●')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('specific')
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [flexFrequency, setFlexFrequency] = useState(3)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? '')
      setIcon(habit?.emoji ?? '●')

      // Schedule mode
      if (habit?.scheduledDays && habit.scheduledDays.length > 0) {
        setScheduleMode('specific')
        setSelectedDays(new Set(habit.scheduledDays))
      } else if (habit?.frequencyPerWeek === 7) {
        setScheduleMode('specific')
        setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]))
      } else if (habit) {
        setScheduleMode('flexible')
        setFlexFrequency(habit.frequencyPerWeek ?? 3)
      }

      // Period
      setStartDate(habit?.startDate ? toDateKey(habit.startDate) : toDateKey(new Date()))
      if (habit?.endDate) {
        setHasEndDate(true)
        setEndDate(toDateKey(habit.endDate))
      } else {
        setHasEndDate(false)
        setEndDate('')
      }

      // Defaults for new
      if (!habit) {
        setScheduleMode('specific')
        setSelectedDays(new Set([1, 2, 3, 4, 5]))
        setStartDate(toDateKey(new Date()))
        setHasEndDate(false)
        setEndDate('')
      }
    }
  }, [open, habit])

  if (!open) return null

  const isEditing = !!habit
  const canSave = name.trim().length > 0 &&
    (scheduleMode === 'flexible' || selectedDays.size > 0)

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      next.has(day) ? next.delete(day) : next.add(day)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return

    const base: HabitFormData = {
      name: name.trim(),
      emoji: icon,
      frequencyPerWeek: scheduleMode === 'specific' ? [...selectedDays].length : flexFrequency,
      scheduledDays: scheduleMode === 'specific' ? [...selectedDays].sort() : [],
      startDate: startDate ? new Date(startDate + 'T00:00:00') : undefined,
      endDate: hasEndDate && endDate ? new Date(endDate + 'T23:59:59') : undefined,
    }
    onSave(base)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-paper px-5 pb-6 pt-3 shadow-xl sm:rounded-2xl dark:bg-paper-dark">
        <div className="mx-auto mb-4 h-0.5 w-10 rounded-full bg-border dark:bg-border-dark sm:hidden" />

        <h2 className="mb-4 text-lg font-bold text-ink dark:text-gray-100">
          {isEditing ? 'Edit Habit' : 'New Habit'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="habitName" className="mb-1.5 block text-sm font-semibold uppercase tracking-wider text-muted">
              Name
            </label>
            <input id="habitName" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drink 8 glasses of water" autoFocus
              className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-base text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
          </div>

          {/* Symbol */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Symbol</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setIcon(s)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-base transition-all ${
                    icon === s
                      ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                      : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Schedule</label>
            <div className="mb-3 flex rounded-md border border-border p-0.5 dark:border-border-dark">
              <button type="button" onClick={() => setScheduleMode('specific')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${
                  scheduleMode === 'specific' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'
                }`}>Specific days</button>
              <button type="button" onClick={() => setScheduleMode('flexible')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${
                  scheduleMode === 'flexible' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'
                }`}>Times per week</button>
            </div>

            {scheduleMode === 'specific' ? (
              <div className="flex justify-between gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-all ${
                      selectedDays.has(i)
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-muted hover:bg-border dark:bg-background-dark'
                    }`}>{label}</button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {FLEX_FREQUENCY_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFlexFrequency(opt.value)}
                    className={`rounded-md px-3.5 py-2 text-sm font-medium transition-all ${
                      flexFrequency === opt.value
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400'
                    }`}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Period</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted">From</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100 dark:color-scheme-dark" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted">Until</span>
                {hasEndDate ? (
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="flex-1 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100 dark:color-scheme-dark" />
                ) : (
                  <span className="flex-1 text-sm text-muted">Ongoing</span>
                )}
                <button type="button" onClick={() => setHasEndDate((v) => !v)}
                  className="text-xs text-accent underline underline-offset-2">
                  {hasEndDate ? 'Make ongoing' : 'Set end date'}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light dark:border-border-dark dark:text-gray-400">
              Cancel
            </button>
            <button type="submit" disabled={!canSave}
              className="flex-1 rounded-lg bg-ink py-3 text-sm font-semibold text-paper hover:bg-primary-dark active:scale-[0.98] disabled:opacity-40 dark:bg-gray-200 dark:text-gray-900">
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
