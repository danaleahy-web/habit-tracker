import { useState, useEffect, useCallback } from 'react'
import {
  startOAuth, exchangeToken, isStravaConnected, getAthleteName,
  disconnectStrava, syncActivities, getLastSyncTime, getLocalActivityCount,
  type SyncResult,
} from '../services/strava'

type ConnectionStatus = 'loading' | 'disconnected' | 'connected'

export function SettingsPage() {
  const [stravaStatus, setStravaStatus] = useState<ConnectionStatus>('loading')
  const [athleteName, setAthleteName] = useState('')
  const [lastSync, setLastSync] = useState<string | undefined>()
  const [activityCount, setActivityCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')
  const [oauthProcessing, setOauthProcessing] = useState(false)

  const loadStravaStatus = useCallback(async () => {
    const connected = await isStravaConnected()
    if (connected) {
      setStravaStatus('connected')
      setAthleteName((await getAthleteName()) || 'Athlete')
      setLastSync(await getLastSyncTime())
      setActivityCount(await getLocalActivityCount())
    } else {
      setStravaStatus('disconnected')
    }
  }, [])

  // Handle OAuth redirect — check for ?code= in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError(`Authorization denied: ${oauthError}`)
      window.history.replaceState({}, '', window.location.pathname)
      loadStravaStatus()
      return
    }

    if (code) {
      setOauthProcessing(true)
      window.history.replaceState({}, '', window.location.pathname)
      exchangeToken(code)
        .then(async () => {
          setOauthProcessing(false)
          await loadStravaStatus()
          setSyncing(true)
          try { setSyncResult(await syncActivities()) }
          catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
          finally { setSyncing(false); await loadStravaStatus() }
        })
        .catch((err) => {
          setOauthProcessing(false)
          setError(err instanceof Error ? err.message : 'OAuth failed')
          loadStravaStatus()
        })
    } else {
      loadStravaStatus()
    }
  }, [loadStravaStatus])

  const handleConnect = async () => {
    setError('')
    try { await startOAuth() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to start OAuth') }
  }

  const handleSync = async () => {
    setError(''); setSyncResult(null); setSyncing(true)
    try { setSyncResult(await syncActivities()); await loadStravaStatus() }
    catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
    finally { setSyncing(false) }
  }

  const handleDisconnect = async () => {
    await disconnectStrava()
    setStravaStatus('disconnected'); setAthleteName(''); setLastSync(undefined); setSyncResult(null)
  }

  const fmtSync = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="px-4 pb-6 pt-6">
      <h1 className="text-2xl font-bold text-ink dark:text-gray-100">Settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your data and connections.</p>

      {/* ===== Strava Section ===== */}
      <div className="mt-6">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Strava</h2>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError('')} className="mt-1 text-xs text-red-500 underline underline-offset-2">Dismiss</button>
          </div>
        )}

        {(stravaStatus === 'loading' || oauthProcessing) ? (
          <p className="py-4 text-center text-sm text-muted">
            {oauthProcessing ? 'Connecting to Strava…' : 'Loading…'}
          </p>
        ) : stravaStatus === 'disconnected' ? (
          /* Disconnected */
          <div>
            <p className="text-sm text-ink-light dark:text-gray-400">
              Link your Strava account to import activities into your journal.
            </p>
            <button onClick={handleConnect}
              className="mt-3 w-full rounded-lg bg-ink py-3 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] dark:bg-gray-200 dark:text-gray-900">
              Connect with Strava
            </button>
            <p className="mt-2 text-[11px] text-muted">Uses OAuth2 — your password is never shared.</p>
          </div>
        ) : (
          /* Connected */
          <div className="space-y-3">
            {/* Status row */}
            <div className="flex items-center justify-between border-b border-border pb-3 dark:border-border-dark">
              <div>
                <p className="text-sm font-medium text-ink dark:text-gray-100">{athleteName}</p>
                <p className="text-[11px] text-accent">Connected</p>
              </div>
              <button onClick={handleDisconnect}
                className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">
                Disconnect
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-xl font-bold text-ink dark:text-gray-100">{activityCount}</p>
                <p className="text-[11px] text-muted">Activities</p>
              </div>
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-sm font-semibold text-ink dark:text-gray-100">{lastSync ? fmtSync(lastSync) : 'Never'}</p>
                <p className="text-[11px] text-muted">Last synced</p>
              </div>
            </div>

            {/* Sync button */}
            <button onClick={handleSync} disabled={syncing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 dark:bg-gray-200 dark:text-gray-900">
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>

            {/* Result */}
            {syncResult && !syncing && (
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-sm font-semibold text-ink dark:text-gray-100">Sync complete</p>
                <p className="mt-1 text-xs text-muted">
                  {syncResult.fetched} fetched · {syncResult.newlyAdded} new · {syncResult.alreadyExisted} skipped
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Data Section ===== */}
      <div className="mt-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Data</h2>
        <div className="space-y-1">
          <SettingsButton label="Export to JSON" desc="Download a backup of all your data" />
          <SettingsButton label="Import from JSON" desc="Restore data from a backup file" />
        </div>
      </div>

      {/* ===== Danger Zone ===== */}
      <div className="mt-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Danger Zone</h2>
        <SettingsButton label="Reset Strava Credentials" desc="Remove saved API keys and re-enter them" danger />
      </div>
    </div>
  )
}

function SettingsButton({ label, desc, danger }: { label: string; desc: string; danger?: boolean }) {
  return (
    <button className="flex w-full items-start gap-4 border-b border-border px-1 py-4 text-left transition-colors last:border-0 hover:bg-background dark:border-border-dark dark:hover:bg-background-dark">
      <div>
        <p className={`text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-ink dark:text-gray-100'}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
    </button>
  )
}
