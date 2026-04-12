import { useState, useEffect } from 'react'
import type { Workout, Exercise } from '../db/index'

const WORKOUT_TYPES = ['Strength', 'Core', 'Cardio', 'Flexibility', 'HIIT', 'Sport', 'Other']

const ICON_OPTIONS = [
  '●', '◆', '■', '▲', '★', '✦', '◉', '⬢',
]

const emptyExercise = (): Exercise => ({
  name: '',
  sets: 3,
  reps: 10,
  weight: undefined,
  unit: 'kg',
  notes: '',
})

interface WorkoutFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; emoji: string; type: string; exercises: Exercise[] }) => void
  workout?: Workout
}

export function WorkoutFormModal({ open, onClose, onSave, workout }: WorkoutFormModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('●')
  const [type, setType] = useState('Strength')
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])

  useEffect(() => {
    if (open) {
      setName(workout?.name ?? '')
      setIcon(workout?.emoji ?? '●')
      setType(workout?.type ?? 'Strength')
      setExercises(
        workout?.exercises?.length
          ? workout.exercises.map((e) => ({ ...e }))
          : [emptyExercise()]
      )
    }
  }, [open, workout])

  if (!open) return null

  const isEditing = !!workout
  const validExercises = exercises.filter((e) => e.name.trim().length > 0)
  const canSave = name.trim().length > 0 && validExercises.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave({ name: name.trim(), emoji: icon, type, exercises: validExercises })
  }

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    )
  }

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-paper px-6 pb-8 pt-4 shadow-xl sm:rounded-2xl dark:bg-paper-dark">
        <div className="mx-auto mb-5 h-0.5 w-10 rounded-full bg-border dark:bg-border-dark sm:hidden" />

        <h2 className="mb-1 text-xl font-bold text-ink dark:text-gray-100">
          {isEditing ? 'Edit Workout' : 'New Workout'}
        </h2>
        <p className="mb-6 text-sm text-muted">
          Build a routine with multiple exercises
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="workoutName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Workout Name
            </label>
            <input
              id="workoutName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Workout, Upper Body Push"
              autoFocus
              className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-base text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
            />
          </div>

          {/* Symbol + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">Symbol</label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIcon(s)}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-base transition-all ${
                      icon === s
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      type === t
                        ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-background text-ink-light hover:bg-border dark:bg-background-dark dark:text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Exercises ({validExercises.length})
            </label>

            <div className="space-y-2.5">
              {exercises.map((ex, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 dark:border-border-dark dark:bg-background-dark">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-muted">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => updateExercise(i, 'name', e.target.value)}
                      placeholder="Exercise name"
                      className="flex-1 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
                    />
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExercise(i)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs text-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-muted">Sets</label>
                      <input type="number" min={1} value={ex.sets}
                        onChange={(e) => updateExercise(i, 'sets', parseInt(e.target.value) || 1)}
                        className="w-full rounded-md border border-border bg-paper px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-muted">Reps</label>
                      <input type="number" min={1} value={ex.reps}
                        onChange={(e) => updateExercise(i, 'reps', parseInt(e.target.value) || 1)}
                        className="w-full rounded-md border border-border bg-paper px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-muted">Weight</label>
                      <div className="flex">
                        <input type="number" min={0} step={0.5} value={ex.weight ?? ''} placeholder="—"
                          onChange={(e) => updateExercise(i, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-l-md border border-r-0 border-border bg-paper px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
                        <button type="button"
                          onClick={() => updateExercise(i, 'unit', ex.unit === 'kg' ? 'lbs' : 'kg')}
                          className="rounded-r-md border border-border bg-background px-2 py-1.5 text-[10px] font-bold text-muted dark:border-border-dark dark:bg-background-dark">
                          {ex.unit || 'kg'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <input type="text" value={ex.notes ?? ''}
                    onChange={(e) => updateExercise(i, 'notes', e.target.value)}
                    placeholder="Notes (optional)"
                    className="mt-2 w-full rounded-md border border-border bg-paper px-3 py-1.5 text-xs text-ink-light outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-400" />
                </div>
              ))}
            </div>

            <button type="button"
              onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
              className="mt-2.5 w-full rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent dark:border-border-dark">
              + Add Exercise
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light hover:bg-background dark:border-border-dark dark:text-gray-400">
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
