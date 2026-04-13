import { useState, useEffect, useCallback, useRef } from 'react'
import type { JournalNote } from '../db/index'
import { getAllOutstandingTasks, toggleTask, deleteTask, rescheduleTask, addTask } from '../db/notes'
import { toDateKey, addDays } from '../lib/dates'

export function TasksPage() {
  const [tasks, setTasks] = useState<JournalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState(toDateKey(new Date()))
  const [rescheduleId, setRescheduleId] = useState<number | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const toggledRef = useRef<Map<number, boolean>>(new Map())
  const [, forceRender] = useState(0)

  const refresh = useCallback(async () => {
    const all = await getAllOutstandingTasks()
    all.sort((a, b) => a.date.getTime() - b.date.getTime())
    setTasks(all)
    toggledRef.current = new Map()
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleToggle = (id: number) => {
    toggledRef.current.set(id, true)
    forceRender((n) => n + 1)
    toggleTask(id)
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    refresh()
  }

  const handleReschedule = async () => {
    if (rescheduleId == null || !rescheduleDate) return
    await rescheduleTask(rescheduleId, new Date(rescheduleDate + 'T12:00:00'))
    setRescheduleId(null)
    refresh()
  }

  const handleAdd = async () => {
    if (!newText.trim()) return
    await addTask(new Date(newDate + 'T12:00:00'), newText.trim())
    setNewText('')
    setShowAdd(false)
    refresh()
  }

  // Group tasks by date
  const grouped = new Map<string, JournalNote[]>()
  for (const t of tasks) {
    if (toggledRef.current.has(t.id!)) continue // hide toggled-off tasks
    const key = toDateKey(t.date)
    const arr = grouped.get(key) || []
    arr.push(t)
    grouped.set(key, arr)
  }

  const today = toDateKey(new Date())
  const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  // Separate overdue, today, upcoming
  const overdue = sortedGroups.filter(([k]) => k < today)
  const todayGroup = sortedGroups.filter(([k]) => k === today)
  const upcoming = sortedGroups.filter(([k]) => k > today)

  const formatGroupDate = (key: string) => {
    if (key === today) return 'Today'
    const d = new Date(key + 'T12:00:00')
    const yesterday = toDateKey(addDays(new Date(), -1))
    const tomorrow = toDateKey(addDays(new Date(), 1))
    if (key === yesterday) return 'Yesterday'
    if (key === tomorrow) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted">Loading…</p></div>
  }

  const totalOutstanding = tasks.filter((t) => !toggledRef.current.has(t.id!)).length

  return (
    <div className="px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink dark:text-gray-100">Tasks</h1>
          <p className="mt-0.5 text-xs text-muted">{totalOutstanding} outstanding</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper dark:bg-gray-200 dark:text-gray-900">
          + New
        </button>
      </div>

      {/* Add task */}
      {showAdd && (
        <div className="mt-3 rounded-lg border border-border bg-paper p-3 dark:border-border-dark dark:bg-paper-dark">
          <input type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
            placeholder="Task description" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-background-dark dark:text-gray-100" />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted">Date:</span>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-background-dark dark:text-gray-100 dark:color-scheme-dark" />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={handleAdd} disabled={!newText.trim()}
              className="rounded-md bg-ink px-4 py-1.5 text-xs font-medium text-paper disabled:opacity-40 dark:bg-gray-200 dark:text-gray-900">
              Add
            </button>
            <button onClick={() => { setShowAdd(false); setNewText('') }}
              className="text-xs text-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalOutstanding === 0 && !showAdd && (
        <div className="mt-12 text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <p className="mt-4 text-sm text-ink-light dark:text-gray-400">All caught up</p>
          <p className="mt-1 text-xs text-muted">No outstanding tasks.</p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-500">Overdue</p>
          {overdue.map(([dateKey, dateTasks]) => (
            <TaskGroup key={dateKey} label={formatGroupDate(dateKey)} tasks={dateTasks}
              onToggle={handleToggle} onDelete={handleDelete}
              onReschedule={(id) => { setRescheduleId(id); setRescheduleDate(toDateKey(addDays(new Date(), 1))) }} />
          ))}
        </div>
      )}

      {/* Today */}
      {todayGroup.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Today</p>
          {todayGroup.map(([dateKey, dateTasks]) => (
            <TaskGroup key={dateKey} label={formatGroupDate(dateKey)} tasks={dateTasks}
              onToggle={handleToggle} onDelete={handleDelete}
              onReschedule={(id) => { setRescheduleId(id); setRescheduleDate(toDateKey(addDays(new Date(), 1))) }} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Upcoming</p>
          {upcoming.map(([dateKey, dateTasks]) => (
            <TaskGroup key={dateKey} label={formatGroupDate(dateKey)} tasks={dateTasks}
              onToggle={handleToggle} onDelete={handleDelete}
              onReschedule={(id) => { setRescheduleId(id); setRescheduleDate(toDateKey(addDays(new Date(), 1))) }} />
          ))}
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleId != null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setRescheduleId(null)} />
          <div className="relative mx-6 w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl dark:bg-paper-dark">
            <h3 className="text-base font-bold text-ink dark:text-gray-100">Reschedule task</h3>
            <input type="date" value={rescheduleDate}
              min={toDateKey(new Date())}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-background-dark dark:text-gray-100 dark:color-scheme-dark" />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setRescheduleId(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-ink-light dark:border-border-dark dark:text-gray-400">
                Cancel
              </button>
              <button onClick={handleReschedule}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper dark:bg-gray-200 dark:text-gray-900">
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskGroup({ label, tasks, onToggle, onDelete, onReschedule }: {
  label: string; tasks: JournalNote[]
  onToggle: (id: number) => void; onDelete: (id: number) => void; onReschedule: (id: number) => void
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-medium text-ink-light dark:text-gray-400">{label}</p>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center border-b border-border last:border-0 dark:border-border-dark">
            <button onClick={() => onToggle(task.id!)}
              className="flex flex-1 items-center gap-3 px-1 py-2.5 text-left active:bg-background dark:active:bg-background-dark">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border dark:border-border-dark" />
              <span className="flex-1 text-sm text-ink dark:text-gray-200">{task.content}</span>
            </button>
            <button onClick={() => onReschedule(task.id!)}
              className="px-2 py-2.5 text-[10px] text-accent underline underline-offset-2">Move</button>
            <button onClick={() => onDelete(task.id!)}
              className="px-2 py-2.5 text-xs text-red-400">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
