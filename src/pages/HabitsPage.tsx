import { useState, useEffect, useCallback } from 'react'
import type { Habit, Workout, JournalNote } from '../db/index'
import { getAllHabits, createHabit, updateHabit, archiveHabit, unarchiveHabit, deleteHabit } from '../db/habits'
import { getAllWorkouts, createWorkout, updateWorkout, archiveWorkout, unarchiveWorkout, deleteWorkout } from '../db/workouts'
import { getAllOutstandingTasks, addTask, deleteTask } from '../db/notes'
import { HabitFormModal, type HabitFormData } from '../components/HabitFormModal'
import { WorkoutFormModal, type WorkoutFormData } from '../components/WorkoutFormModal'
import { formatSchedule } from '../lib/schedule'
import { formatExerciseDetail } from '../lib/exercise'
import { toDateKey } from '../lib/dates'

type CreateType = 'habit' | 'workout' | 'task'

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [tasks, setTasks] = useState<JournalNote[]>([])
  const [loading, setLoading] = useState(true)

  const [showChooser, setShowChooser] = useState(false)
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'habit' | 'workout'; id: number } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskDate, setTaskDate] = useState(toDateKey(new Date()))

  const refresh = useCallback(async () => {
    const [h, w, t] = await Promise.all([getAllHabits(), getAllWorkouts(), getAllOutstandingTasks()])
    setHabits(h)
    setWorkouts(w)
    setTasks(t.sort((a, b) => a.date.getTime() - b.date.getTime()))
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const activeHabits = habits.filter((h) => !h.archivedAt)
  const activeWorkouts = workouts.filter((w) => !w.archivedAt)
  const archivedItems = [
    ...habits.filter((h) => h.archivedAt).map((h) => ({ ...h, _kind: 'habit' as const })),
    ...workouts.filter((w) => w.archivedAt).map((w) => ({ ...w, _kind: 'workout' as const })),
  ]

  const pickType = (t: CreateType) => {
    setShowChooser(false)
    if (t === 'habit') { setEditingHabit(undefined); setHabitModalOpen(true) }
    if (t === 'workout') { setEditingWorkout(undefined); setWorkoutModalOpen(true) }
    if (t === 'task') { setShowTaskInput(true); setTaskText(''); setTaskDate(toDateKey(new Date())) }
  }

  const handleAddTask = async () => {
    if (!taskText.trim()) return
    await addTask(new Date(taskDate + 'T12:00:00'), taskText.trim())
    setShowTaskInput(false); setTaskText('')
    await refresh()
  }

  const handleDeleteTask = async (id: number) => {
    await deleteTask(id)
    await refresh()
  }

  const handleSaveHabit = async (data: HabitFormData) => {
    if (editingHabit?.id != null) await updateHabit(editingHabit.id, data)
    else await createHabit(data)
    setHabitModalOpen(false); setEditingHabit(undefined); await refresh()
  }

  const handleSaveWorkout = async (data: WorkoutFormData) => {
    if (editingWorkout?.id != null) await updateWorkout(editingWorkout.id, data)
    else await createWorkout(data)
    setWorkoutModalOpen(false); setEditingWorkout(undefined); await refresh()
  }

  const handleArchive = async (type: 'habit' | 'workout', id: number) => {
    if (type === 'habit') await archiveHabit(id)
    else await archiveWorkout(id)
    await refresh()
  }
  const handleUnarchive = async (type: 'habit' | 'workout', id: number) => {
    if (type === 'habit') await unarchiveHabit(id)
    else await unarchiveWorkout(id)
    await refresh()
  }
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    if (confirmDelete.type === 'habit') await deleteHabit(confirmDelete.id)
    else await deleteWorkout(confirmDelete.id)
    setConfirmDelete(null); await refresh()
  }

  const habitLabel = (h: Habit) => formatSchedule(h)
  const isEmpty = activeHabits.length === 0 && activeWorkouts.length === 0 && tasks.length === 0

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted">Loading…</p></div>
  }

  return (
    <div className="px-4 pb-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink dark:text-gray-100">Plan</h1>
        <button onClick={() => setShowChooser(true)}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] dark:bg-gray-200 dark:text-gray-900">
          + New
        </button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="mt-10 text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <p className="mt-4 text-sm text-ink-light dark:text-gray-400">Nothing planned yet</p>
          <p className="mt-1 text-xs text-muted">Tap "+ New" to add a habit or workout.</p>
        </div>
      )}

      {/* Habits */}
      {activeHabits.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Habits</h2>
          <ul className="space-y-1.5">
            {activeHabits.map((h) => (
              <ItemCard key={`h-${h.id}`} name={h.name}
                subtitle={habitLabel(h)}
                onEdit={() => { setEditingHabit(h); setHabitModalOpen(true) }}
                onArchive={() => handleArchive('habit', h.id!)}
                onDelete={() => setConfirmDelete({ type: 'habit', id: h.id! })} />
            ))}
          </ul>
        </div>
      )}

      {/* Workouts */}
      {activeWorkouts.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Workouts</h2>
          <ul className="space-y-1.5">
            {activeWorkouts.map((w) => (
              <WorkoutCard key={`w-${w.id}`} workout={w}
                onEdit={() => { setEditingWorkout(w); setWorkoutModalOpen(true) }}
                onArchive={() => handleArchive('workout', w.id!)}
                onDelete={() => setConfirmDelete({ type: 'workout', id: w.id! })} />
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      {(tasks.length > 0 || showTaskInput) && (
        <div className="mt-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Tasks</h2>
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between border-b border-border px-1 py-2.5 dark:border-border-dark">
                <div>
                  <p className="text-sm text-ink dark:text-gray-200">{task.content}</p>
                  <p className="text-xs text-muted">
                    {task.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => handleDeleteTask(task.id!)}
                  className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">Delete</button>
              </li>
            ))}
          </ul>

          {showTaskInput && (
            <div className="mt-2 rounded-lg border border-border bg-paper p-3 dark:border-border-dark dark:bg-paper-dark">
              <input type="text" value={taskText} onChange={(e) => setTaskText(e.target.value)}
                placeholder="Task description" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-background-dark dark:text-gray-100" />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted">Date:</span>
                <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-background-dark dark:text-gray-100 dark:color-scheme-dark" />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={handleAddTask} disabled={!taskText.trim()}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-medium text-paper disabled:opacity-40 dark:bg-gray-200 dark:text-gray-900">Add</button>
                <button onClick={() => { setShowTaskInput(false); setTaskText('') }}
                  className="text-xs text-muted">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archived */}
      {archivedItems.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <svg className={`h-3 w-3 transition-transform ${showArchived ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Archived · {archivedItems.length}
          </button>
          {showArchived && (
            <ul className="mt-3 space-y-1.5">
              {archivedItems.map((item) => (
                <li key={`${item._kind}-${item.id}`}
                  className="flex items-center justify-between border-b border-border px-1 py-2.5 opacity-50 dark:border-border-dark">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-light line-through dark:text-gray-500">{item.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUnarchive(item._kind, item.id!)}
                      className="text-xs text-muted underline underline-offset-2 hover:text-ink">Restore</button>
                    <button onClick={() => setConfirmDelete({ type: item._kind, id: item.id! })}
                      className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Type Chooser */}
      {showChooser && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowChooser(false)} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-paper px-6 pb-8 pt-4 shadow-xl sm:rounded-2xl dark:bg-paper-dark">
            <div className="mx-auto mb-5 h-0.5 w-10 rounded-full bg-border dark:bg-border-dark sm:hidden" />
            <h2 className="mb-5 text-lg font-bold text-ink dark:text-gray-100">Add to your plan</h2>
            <div className="space-y-2">
              <button onClick={() => pickType('habit')}
                className="flex w-full items-center gap-4 rounded-lg border border-border px-4 py-4 text-left transition-colors hover:bg-background active:scale-[0.98] dark:border-border-dark dark:hover:bg-background-dark">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-lg text-ink dark:bg-background-dark dark:text-gray-300">●</span>
                <div>
                  <p className="font-semibold text-ink dark:text-gray-100">Habit</p>
                  <p className="text-xs text-muted">A recurring activity to track daily</p>
                </div>
              </button>
              <button onClick={() => pickType('workout')}
                className="flex w-full items-center gap-4 rounded-lg border border-border px-4 py-4 text-left transition-colors hover:bg-background active:scale-[0.98] dark:border-border-dark dark:hover:bg-background-dark">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-lg text-ink dark:bg-background-dark dark:text-gray-300">◆</span>
                <div>
                  <p className="font-semibold text-ink dark:text-gray-100">Workout</p>
                  <p className="text-xs text-muted">A routine with multiple exercises</p>
                </div>
              </button>
              <button onClick={() => pickType('task')}
                className="flex w-full items-center gap-4 rounded-lg border border-border px-4 py-4 text-left transition-colors hover:bg-background active:scale-[0.98] dark:border-border-dark dark:hover:bg-background-dark">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-lg text-ink dark:bg-background-dark dark:text-gray-300">□</span>
                <div>
                  <p className="font-semibold text-ink dark:text-gray-100">Task</p>
                  <p className="text-xs text-muted">A one-off to-do for a specific day</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <HabitFormModal open={habitModalOpen} onClose={() => { setHabitModalOpen(false); setEditingHabit(undefined) }}
        onSave={handleSaveHabit} habit={editingHabit} />
      <WorkoutFormModal open={workoutModalOpen} onClose={() => { setWorkoutModalOpen(false); setEditingWorkout(undefined) }}
        onSave={handleSaveWorkout} workout={editingWorkout} />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmDelete(null)} />
          <div className="relative mx-6 w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl dark:bg-paper-dark">
            <h3 className="text-lg font-bold text-ink dark:text-gray-100">
              Delete {confirmDelete.type}?
            </h3>
            <p className="mt-2 text-sm text-muted">
              This will permanently remove this {confirmDelete.type} and its history.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light dark:border-border-dark dark:text-gray-400">
                Cancel
              </button>
              <button onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.98]">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ name, subtitle, onEdit, onArchive, onDelete }: {
  name: string; subtitle: string
  onEdit: () => void; onArchive: () => void; onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li className="border-b border-border dark:border-border-dark">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 px-1 py-3 text-left">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink dark:text-gray-100">{name}</p>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <svg className={`h-3.5 w-3.5 text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <div className="flex gap-4 px-1 pb-3 text-xs">
          <button onClick={onEdit} className="text-ink-light underline underline-offset-2 hover:text-ink dark:text-gray-400">Edit</button>
          <button onClick={onArchive} className="text-ink-light underline underline-offset-2 hover:text-ink dark:text-gray-400">Archive</button>
          <button onClick={onDelete} className="text-red-400 underline underline-offset-2 hover:text-red-600">Delete</button>
        </div>
      )}
    </li>
  )
}

function WorkoutCard({ workout, onEdit, onArchive, onDelete }: {
  workout: Workout; onEdit: () => void; onArchive: () => void; onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li className="border-b border-border dark:border-border-dark">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 px-1 py-3 text-left">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink dark:text-gray-100">{workout.name}</p>
          <p className="text-xs text-muted">{formatSchedule(workout)}{workout.exercises.length > 0 ? ` · ${workout.exercises.length} exercises` : ''}</p>
        </div>
        <svg className={`h-3.5 w-3.5 text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <>
          <div className="px-1 pb-2">
            <ul className="space-y-1">
              {workout.exercises.map((ex, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="text-xs text-muted">{i + 1}.</span>
                  <span className="flex-1 text-ink-light dark:text-gray-300">{ex.name}</span>
                  <span className="text-xs text-muted">{formatExerciseDetail(ex)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 px-1 pb-3 text-xs">
            <button onClick={onEdit} className="text-ink-light underline underline-offset-2 hover:text-ink dark:text-gray-400">Edit</button>
            <button onClick={onArchive} className="text-ink-light underline underline-offset-2 hover:text-ink dark:text-gray-400">Archive</button>
            <button onClick={onDelete} className="text-red-400 underline underline-offset-2 hover:text-red-600">Delete</button>
          </div>
        </>
      )}
    </li>
  )
}
