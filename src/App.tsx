import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSetupCheck } from './hooks/useSetupCheck'
import { BottomNav } from './components/BottomNav'
import { SetupPage } from './pages/SetupPage'
import { CalendarPage } from './pages/CalendarPage'
import { HabitsPage } from './pages/HabitsPage'
import { SyncPage } from './pages/SyncPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const { status, markComplete } = useSetupCheck()

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <p className="text-lg font-semibold tracking-wide text-ink dark:text-gray-300">HabitSync</p>
          <p className="mt-1 text-xs text-muted">Loading…</p>
        </div>
      </div>
    )
  }

  if (status === 'needs-setup') {
    return <SetupPage onComplete={markComplete} />
  }

  return (
    <BrowserRouter basename="/habit-tracker">
      <div className="flex h-dvh flex-col bg-background dark:bg-background-dark">
        <main className="flex-1 overflow-y-auto pb-16">
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/plan" element={<HabitsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
