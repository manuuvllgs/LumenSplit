import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { useWallet } from '../wallet'
import {
  checkNidoSession,
  DAILY_XLM_CAP,
  isSmartAccount,
  nidoStatus,
  onSessionChange,
  requestNidoSession,
  resumeNidoSession,
} from '../lib/nido'
import { loadSession } from '../lib/nido/session'
import { Button } from './ui'

// Nido sends the owner back here after each approval: record the answer once,
// as early as possible, before any screen reads the session.
const resumed = resumeNidoSession().catch(() => null)

/**
 * For passkey (Nido) accounts only: asks the owner, once, to let LumenSplit
 * act for the account. Classic Freighter accounts never see it.
 */
export function NidoSessionBanner() {
  const { address } = useWallet()
  const [, force] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Re-render when the stored session changes (this tab or another).
  useEffect(() => onSessionChange(() => force((n) => n + 1)), [])

  useEffect(() => {
    if (!isSmartAccount(address)) return
    let alive = true
    void resumed
      .then((r) => {
        if (r?.outcome === 'refused' && r.message) setError(r.message)
        return checkNidoSession(address)
      })
      .catch(() => null)
      .finally(() => alive && force((n) => n + 1))
    return () => {
      alive = false
    }
  }, [address])

  if (!isSmartAccount(address)) return null
  const status = nidoStatus(address)
  if (status.state === 'ready') return null
  const refused = loadSession(address)?.refused

  async function authorize() {
    if (!address) return
    setBusy(true)
    setError(null)
    try {
      await requestNidoSession(address) // navigates to Nido
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  async function recheck() {
    if (!address) return
    setBusy(true)
    try {
      await checkNidoSession(address)
    } finally {
      setBusy(false)
      force((n) => n + 1)
    }
  }

  return (
    <div className="mb-6 space-y-3 rounded-2xl bg-shade p-5 text-on-shade sm:p-6">
      <div className="font-display text-xl">{t('Autoriza LumenSplit una vez')}</div>
      <p className="text-sm text-on-shade-muted">
        {t(
          'Tu cuenta con passkey necesita darle permiso a la app: podrá gestionar tus grupos y pagar tus deudas en XLM, hasta {cap} XLM al día, durante 7 días. Lo confirmas con tu passkey en Nido y vuelves aquí.',
          { cap: DAILY_XLM_CAP },
        )}
      </p>
      {status.state === 'waiting' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={recheck} loading={busy}>
            {t('Comprobar de nuevo')}
          </Button>
          <span className="text-sm text-on-shade-muted">{t('Esperando la confirmación de Nido…')}</span>
        </div>
      ) : (
        <Button variant="accent" onClick={authorize} loading={busy}>
          {status.reason === 'expired' ? t('Renovar el permiso en Nido') : t('Autorizar en Nido')}
        </Button>
      )}
      {(error || refused) && <p className="text-sm" style={{ color: 'var(--neg-on-shade)' }}>⚠ {error ?? refused}</p>}
    </div>
  )
}
