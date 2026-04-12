import { useState, useEffect } from 'react'
import type { Habit } from '../db/index'

/** Minimal bullet-journal symbols for habit icons */
const ICON_OPTIONS = [
  '●', '○', '◆', '◇', '■', '□', '▲', '△',
  '★', '☆', '✦', '✧', '◉', '◎', '▪', '▫',
  '⬡', '⬢', '◈', '✕', '⊕', '⊗', '⊙', '◬',
]

const FREQUENCY_OPTIONS = [
  { value: 7, label: 'Daily' },
  { value: 5, label: '5× / week' },
  { value: 3, label: '3× / week' },
  { value: 2, label: '2× / week' },
  { value: 1, label: '1× / week' },
]

interface HabitFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; emoji: string; frequencyPerWeek: number }) => void
  habit?: Habit
}

export function HabitFormModal({ open, onClose, onSave, habit }: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('●')
  const [frequency, setFrequency] = useState(7)

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? '')
      setIcon(habit?.emoji ?? '●')
      setFrequency(habit?.frequencyPerWeek ?? 7)
    }
  }, [open, habit])

  if (!open) return null

  const isEditing = !!habit
  const canSave = name.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave({ name: name.trim(), emoji: icon, frequencyPerWeek: frequency })
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

          {/* Icon picker */}
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

          {/* Frequency */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Frequency
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    frequency === opt.value
                      ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                      : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400 dark:hover:bg-border-dark'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
