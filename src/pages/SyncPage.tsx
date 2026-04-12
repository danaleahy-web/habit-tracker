import { useState, useEffect, useCallback } from 'react'
import {
  startOAuth, exchangeToken, isStravaConnected, getAthleteName,
  disconnectStrava, syncActivities, getLastSyncTime, getLocalActivityCount,
  type SyncResult,
} from '../services/strava'

type ConnectionStatus = 'loading' | 'disconnected' | 'connected'

export function SyncPage() {
  const [status, setStatus] = useState<ConnectionStatus>('loading')
  const [athleteName, setAthleteName] = useState('')
  const [lastSync, setLastSync] = useState<string | undefined>()
  const [activityCount, setActivityCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')
  const [oauthProcessing, setOauthProcessing] = useState(false)

  const loadStatus = useCallback(async () => {
    const connected = await isStravaConnected()
    if (connected) {
      setStatus('connected')
      setAthleteName((await getAthleteName()) || 'Athlete')
      setLastSync(await getLastSyncTime())
      setActivityCount(await getLocalActivityCount())
    } else {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError(`Authorization denied: ${oauthError}`)
      window.history.replaceState({}, '', '/sync')
      loadStatus()
      return
    }

    if (code) {
      setOauthProcessing(true)
      window.history.replaceState({}, '', '/sync')
      exchangeToken(code)
        .then(async () => {
          setOauthProcessing(false)
          await loadStatus()
          setSyncing(true)
          try { setSyncResult(await syncActivities()) }
          catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
          finally { setSyncing(false); await loadStatus() }
        })
        .catch((err) => {
          setOauthProcessing(false)
          setError(err instanceof Error ? err.message : 'OAuth failed')
          loadStatus()
        })
    } else {
      loadStatus()
    }
  }, [loadStatus])

  const handleConnect = async () => {
    setError('')
    try { await startOAuth() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to start OAuth') }
  }

  const handleSync = async () => {
    setError(''); setSyncResult(null); setSyncing(true)
    try { setSyncResult(await syncActivities()); await loadStatus() }
    catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
    finally { setSyncing(false) }
  }

  const handleDisconnect = async () => {
    await disconnectStrava()
    setStatus('disconnected'); setAthleteName(''); setLastSync(undefined); setSyncResult(null)
  }

  const fmtSync = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (status === 'loading' || oauthProcessing) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted">{oauthProcessing ? 'Connecting to Strava…' : 'Loading…'}</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-6 pt-6">
      <h1 className="text-2xl font-bold text-ink dark:text-gray-100">Strava Sync</h1>
      <p className="mt-1 text-sm text-muted">Sync activities to your journal.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError('')} className="mt-1 text-xs text-red-500 underline underline-offset-2">Dismiss</button>
        </div>
      )}

      {status === 'disconnected' ? (
        <div className="mt-8 text-center">
          <div className="mx-auto h-px w-16 bg-border dark:bg-border-dark" />
          <h2 className="mt-6 text-lg font-bold text-ink dark:text-gray-100">Connect Strava</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Link your account to import runs, rides, and other activities.
          </p>
          <button onClick={handleConnect}
            className="mt-6 w-full rounded-lg bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] dark:bg-gray-200 dark:text-gray-900">
            Connect with Strava
          </button>
          <p className="mt-4 text-[11px] text-muted">Uses OAuth2 — your password is never shared.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Connection status */}
          <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border-dark">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-gray-100">{athleteName}</p>
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 dark:bg-gray-200 dark:text-gray-900">
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>

          {/* Result */}
          {syncResult && !syncing && (
            <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
              <p className="text-sm font-semibold text-ink dark:text-gray-100">Sync complete</p>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted">
                <p>{syncResult.fetched} fetched · {syncResult.newlyAdded} new · {syncResult.alreadyExisted} skipped</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="border-t border-border pt-4 dark:border-border-dark">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">How it works</p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
              <li>· Tap "Sync Now" to pull your latest activities</li>
              <li>· Activities appear on your Journal for the day they happened</li>
              <li>· Duplicates are automatically skipped</li>
              <li>· All data stays on your device</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
