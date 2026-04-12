import { useState, useEffect } from 'react'
import type { Habit } from '../db/index'

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

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Sun–Sat

type ScheduleMode = 'specific' | 'flexible'

interface HabitFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; emoji: string; frequencyPerWeek: number; scheduledDays?: number[] }) => void
  habit?: Habit
}

export function HabitFormModal({ open, onClose, onSave, habit }: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('●')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('specific')
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [flexFrequency, setFlexFrequency] = useState(3)

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? '')
      setIcon(habit?.emoji ?? '●')

      if (habit?.scheduledDays && habit.scheduledDays.length > 0) {
        setScheduleMode('specific')
        setSelectedDays(new Set(habit.scheduledDays))
      } else {
        // Check if it was a "daily" habit (all 7 days)
        if (habit?.frequencyPerWeek === 7) {
          setScheduleMode('specific')
          setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]))
        } else {
          setScheduleMode('flexible')
          setFlexFrequency(habit?.frequencyPerWeek ?? 3)
        }
      }

      // For new habits, default to specific with weekdays selected
      if (!habit) {
        setScheduleMode('specific')
        setSelectedDays(new Set([1, 2, 3, 4, 5])) // Mon–Fri
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

    if (scheduleMode === 'specific') {
      const days = [...selectedDays].sort()
      onSave({
        name: name.trim(),
        emoji: icon,
        frequencyPerWeek: days.length,
        scheduledDays: days,
      })
    } else {
      onSave({
        name: name.trim(),
        emoji: icon,
        frequencyPerWeek: flexFrequency,
        scheduledDays: [],
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-t-2xl bg-paper px-5 pb-6 pt-3 shadow-xl sm:rounded-2xl dark:bg-paper-dark">
        <div className="mx-auto mb-4 h-0.5 w-10 rounded-full bg-border dark:bg-border-dark sm:hidden" />

        <h2 className="mb-4 text-lg font-bold text-ink dark:text-gray-100">
          {isEditing ? 'Edit Habit' : 'New Habit'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="habitName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Name
            </label>
            <input
              id="habitName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drink 8 glasses of water"
              autoFocus
              className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Symbol
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setIcon(s)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-base transition-all ${
                    icon === s
                      ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                      : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400 dark:hover:bg-border-dark'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Schedule
            </label>

            {/* Mode toggle */}
            <div className="mb-3 flex rounded-md border border-border p-0.5 dark:border-border-dark">
              <button type="button" onClick={() => setScheduleMode('specific')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${
                  scheduleMode === 'specific'
                    ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                    : 'text-muted'
                }`}>
                Specific days
              </button>
              <button type="button" onClick={() => setScheduleMode('flexible')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${
                  scheduleMode === 'flexible'
                    ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                    : 'text-muted'
                }`}>
                Times per week
              </button>
            </div>

            {scheduleMode === 'specific' ? (
              /* Day picker */
              <div className="flex justify-between gap-1">
                {DAY_LABELS.map((label, dayIndex) => (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-all ${
                      selectedDays.has(dayIndex)
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-muted hover:bg-border dark:bg-background-dark dark:hover:bg-border-dark'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              /* Flexible frequency */
              <div className="flex flex-wrap gap-1.5">
                {FLEX_FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFlexFrequency(opt.value)}
                    className={`rounded-md px-3.5 py-2 text-sm font-medium transition-all ${
                      flexFrequency === opt.value
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400 dark:hover:bg-border-dark'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Summary */}
            <p className="mt-2 text-xs text-muted">
              {scheduleMode === 'specific'
                ? selectedDays.size === 0
                  ? 'Select at least one day'
                  : selectedDays.size === 7
                    ? 'Every day'
                    : [...selectedDays].sort().map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
                : flexFrequency === 7
                  ? 'Every day'
                  : `Any ${flexFrequency} day${flexFrequency !== 1 ? 's' : ''} per week`
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light transition-colors hover:bg-background dark:border-border-dark dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 rounded-lg bg-ink py-3 text-sm font-semibold text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-40 dark:bg-gray-200 dark:text-gray-900"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
