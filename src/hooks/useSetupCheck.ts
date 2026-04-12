import { useState, useEffect } from 'react'
import { isSetupComplete } from '../db/settings'

type SetupStatus = 'loading' | 'needs-setup' | 'ready'

export function useSetupCheck() {
  const [status, setStatus] = useState<SetupStatus>('loading')

  useEffect(() => {
    isSetupComplete().then((complete) => {
      setStatus(complete ? 'ready' : 'needs-setup')
    })
  }, [])

  const markComplete = () => setStatus('ready')

  return { status, markComplete }
}
