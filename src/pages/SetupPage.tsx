import { useState } from 'react'
import { setSetting } from '../db/settings'

interface Props {
  onComplete: () => void
}

export function SetupPage({ onComplete }: Props) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedId = clientId.trim()
    const trimmedSecret = clientSecret.trim()

    if (!trimmedId || !trimmedSecret) {
      setError('Both fields are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await setSetting('strava_client_id', trimmedId)
      await setSetting('strava_client_secret', trimmedSecret)
      await setSetting('setup_complete', 'true')
      onComplete()
    } catch {
      setError('Failed to save credentials. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 dark:bg-background-dark">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-ink dark:text-gray-100">
            HabitSync
          </h1>
          <div className="mx-auto mt-2 h-px w-12 bg-accent" />
        </div>

        <p className="mb-6 text-center text-sm leading-relaxed text-ink-light dark:text-gray-400">
          Connect your Strava account to get started.
          <br />
          Find your API credentials at{' '}
          <a
            href="https://www.strava.com/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            strava.com/settings/api
          </a>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="clientId"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Client ID
            </label>
            <input
              id="clientId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="12345"
              className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="clientSecret"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Client Secret
            </label>
            <input
              id="clientSecret"
              type="password"
              autoComplete="off"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 dark:bg-gray-200 dark:text-gray-900"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Your credentials are stored locally on this device only.
          <br />
          They are never sent to any third-party server.
        </p>
      </div>
    </div>
  )
}
