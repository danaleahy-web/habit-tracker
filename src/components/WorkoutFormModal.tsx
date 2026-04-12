import { useState, useEffect } from 'react'
import type { Workout, Exercise } from '../db/index'
import { toDateKey } from '../lib/dates'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const FLEX_FREQ = [
  { value: 7, label: 'Daily' },
  { value: 5, label: '5×' },
  { value: 4, label: '4×' },
  { value: 3, label: '3×' },
  { value: 2, label: '2×' },
  { value: 1, label: '1×' },
]

type ScheduleMode = 'specific' | 'flexible'

const emptyExercise = (): Exercise => ({ name: '', sets: 3, reps: 10, weight: undefined, unit: 'kg', notes: '' })

export interface WorkoutFormData {
  name: string; emoji: string; type: string; exercises: Exercise[]
  minExercisesToComplete?: number
  scheduledDays?: number[]; frequencyPerWeek?: number
  startDate?: Date; endDate?: Date
}

interface WorkoutFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: WorkoutFormData) => void
  workout?: Workout
}

export function WorkoutFormModal({ open, onClose, onSave, workout }: WorkoutFormModalProps) {
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])
  const [completionMode, setCompletionMode] = useState<'all' | 'minimum'>('all')
  const [minToComplete, setMinToComplete] = useState(1)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('specific')
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [flexFrequency, setFlexFrequency] = useState(3)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)

  useEffect(() => {
    if (open) {
      setName(workout?.name ?? '')
      setExercises(workout?.exercises?.length ? workout.exercises.map((e) => ({ ...e })) : [emptyExercise()])

      if (workout?.minExercisesToComplete != null) {
        setCompletionMode('minimum')
        setMinToComplete(workout.minExercisesToComplete)
      } else {
        setCompletionMode('all')
        setMinToComplete(1)
      }

      if (workout?.scheduledDays && workout.scheduledDays.length > 0) {
        setScheduleMode('specific')
        setSelectedDays(new Set(workout.scheduledDays))
      } else if (workout?.frequencyPerWeek) {
        setScheduleMode('flexible')
        setFlexFrequency(workout.frequencyPerWeek)
      } else {
        setScheduleMode('specific')
        setSelectedDays(new Set([1, 2, 3, 4, 5]))
      }

      setStartDate(workout?.startDate ? toDateKey(workout.startDate) : toDateKey(new Date()))
      if (workout?.endDate) { setHasEndDate(true); setEndDate(toDateKey(workout.endDate)) }
      else { setHasEndDate(false); setEndDate('') }

      if (!workout) {
        setScheduleMode('specific')
        setSelectedDays(new Set([1, 3, 5]))
        setStartDate(toDateKey(new Date()))
        setHasEndDate(false)
      }
    }
  }, [open, workout])

  if (!open) return null

  const isEditing = !!workout
  const validExercises = exercises.filter((e) => e.name.trim().length > 0)
  const canSave = name.trim().length > 0 && validExercises.length > 0 &&
    (scheduleMode === 'flexible' || selectedDays.size > 0)

  const toggleDay = (d: number) => { setSelectedDays((p) => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n }) }

  const updateExercise = (i: number, field: keyof Exercise, value: string | number) => {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave({
      name: name.trim(), emoji: '●', type: 'Workout', exercises: validExercises,
      minExercisesToComplete: completionMode === 'minimum' ? minToComplete : undefined,
      scheduledDays: scheduleMode === 'specific' ? [...selectedDays].sort() : [],
      frequencyPerWeek: scheduleMode === 'specific' ? selectedDays.size : flexFrequency,
      startDate: startDate ? new Date(startDate + 'T00:00:00') : undefined,
      endDate: hasEndDate && endDate ? new Date(endDate + 'T23:59:59') : undefined,
    })
  }

  const inputCls = "w-full rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-paper px-5 pb-6 pt-3 shadow-xl sm:rounded-2xl dark:bg-paper-dark">
        <div className="mx-auto mb-4 h-0.5 w-10 rounded-full bg-border dark:bg-border-dark sm:hidden" />
        <h2 className="mb-4 text-lg font-bold text-ink dark:text-gray-100">{isEditing ? 'Edit Workout' : 'New Workout'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="wName" className="mb-1.5 block text-sm font-semibold uppercase tracking-wider text-muted">Name</label>
            <input id="wName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Core Workout" autoFocus className={inputCls} />
          </div>

          {/* Exercises */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Exercises ({validExercises.length})</label>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 dark:border-border-dark dark:bg-background-dark">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{i + 1}.</span>
                    <input type="text" value={ex.name} onChange={(e) => updateExercise(i, 'name', e.target.value)} placeholder="Exercise name" className={`flex-1 ${inputCls}`} />
                    {exercises.length > 1 && (
                      <button type="button" onClick={() => setExercises((p) => p.filter((_, idx) => idx !== i))}
                        className="text-xs text-muted hover:text-red-500">×</button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted">Sets</label>
                      <input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(i, 'sets', parseInt(e.target.value) || 1)} className={inputCls + ' text-center'} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted">Reps</label>
                      <input type="number" min={1} value={ex.reps} onChange={(e) => updateExercise(i, 'reps', parseInt(e.target.value) || 1)} className={inputCls + ' text-center'} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted">Weight</label>
                      <div className="flex">
                        <input type="number" min={0} step={0.5} value={ex.weight ?? ''} placeholder="—"
                          onChange={(e) => updateExercise(i, 'weight', parseFloat(e.target.value) || 0)}
                          className={inputCls + ' rounded-r-none border-r-0 text-center'} />
                        <button type="button" onClick={() => updateExercise(i, 'unit', ex.unit === 'kg' ? 'lbs' : 'kg')}
                          className="rounded-r-md border border-border bg-background px-2 text-xs font-bold text-muted dark:border-border-dark dark:bg-background-dark">{ex.unit || 'kg'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setExercises((p) => [...p, emptyExercise()])}
              className="mt-2 w-full rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent dark:border-border-dark">
              + Add Exercise
            </button>
          </div>

          {/* Completion threshold */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Completion</label>
            <div className="mb-3 flex rounded-md border border-border p-0.5 dark:border-border-dark">
              <button type="button" onClick={() => setCompletionMode('all')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${completionMode === 'all' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'}`}>
                All exercises
              </button>
              <button type="button" onClick={() => { setCompletionMode('minimum'); setMinToComplete(Math.max(1, Math.min(minToComplete, validExercises.length || 1))) }}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${completionMode === 'minimum' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'}`}>
                Minimum
              </button>
            </div>
            {completionMode === 'minimum' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-light dark:text-gray-400">Complete at least</span>
                <input type="number" min={1} max={Math.max(1, validExercises.length)}
                  value={minToComplete} onChange={(e) => setMinToComplete(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 rounded-md border border-border bg-paper px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
                <span className="text-sm text-ink-light dark:text-gray-400">of {validExercises.length || '—'}</span>
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted">
              {completionMode === 'all'
                ? 'Workout is done when every exercise is crossed off'
                : `Workout is done after ${minToComplete} exercise${minToComplete !== 1 ? 's are' : ' is'} crossed off`}
            </p>
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted">Schedule</label>
            <div className="mb-3 flex rounded-md border border-border p-0.5 dark:border-border-dark">
              <button type="button" onClick={() => setScheduleMode('specific')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${scheduleMode === 'specific' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'}`}>Specific days</button>
              <button type="button" onClick={() => setScheduleMode('flexible')}
                className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-all ${scheduleMode === 'flexible' ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'text-muted'}`}>Times per week</button>
            </div>
            {scheduleMode === 'specific' ? (
              <div className="flex justify-between gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-all ${
                      selectedDays.has(i) ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'bg-background text-muted dark:bg-background-dark'
                    }`}>{label}</button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {FLEX_FREQ.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFlexFrequency(opt.value)}
                    className={`rounded-md px-3.5 py-2 text-sm font-medium transition-all ${
                      flexFrequency === opt.value ? 'bg-ink text-paper dark:bg-gray-200 dark:text-gray-900' : 'bg-background text-ink-light dark:bg-background-dark dark:text-gray-400'
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
                  className={`flex-1 ${inputCls} dark:color-scheme-dark`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted">Until</span>
                {hasEndDate ? (
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
                    className={`flex-1 ${inputCls} dark:color-scheme-dark`} />
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
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light dark:border-border-dark dark:text-gray-400">Cancel</button>
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
