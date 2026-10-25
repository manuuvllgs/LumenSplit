import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { setMyName, useMyName } from '../lib/aliases'
import { MAX_NAME_LENGTH, validateName } from '../lib/profile'
import { useWallet } from '../wallet'
import { Button, Card, KeyHint, Loading } from './ui'
import { t } from '../i18n'

const SKIP_KEY = 'lumensplit.skipName'

/** First visit with a wallet that has no name yet → ask for one before anything else. */
export function NameGate({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  const name = useMyName(address)
  const { pathname } = useLocation()
  const [skipped, setSkipped] = useState(() => {
    try {
      return sessionStorage.getItem(SKIP_KEY) === '1'
    } catch {
      return false
    }
  })

  // The join page asks for the name itself (from the group's list).
  if (!address || pathname.startsWith('/join/') || pathname === '/faq' || skipped) return children
  if (name === undefined) return <Loading />
  if (name === null)
    return (
      <NameSetup
        address={address}
        onSkip={() => {
          try {
            sessionStorage.setItem(SKIP_KEY, '1')
          } catch {
            /* ignore */
          }
          setSkipped(true)
        }}
      />
    )
  return children
}

function NameSetup({ address, onSkip }: { address: string; onSkip: () => void }) {
  const [draft, setDraft] = useState('')
  const invalid = draft ? validateName(draft) : null

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (validateName(draft)) return
    setMyName(address, draft) // local, instant; shared with the group when you create or join one
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-md space-y-5 pt-4 text-center sm:pt-10">
      <h1 className="text-4xl text-ink-900 sm:text-5xl">{t('¿Cómo te llamas?')}</h1>
      <p className="mx-auto max-w-sm text-base text-ink-700">
        {t('Es el nombre que verán tus amigos en lugar de tu dirección. Se guarda en este dispositivo y lo compartimos con tus grupos cuando creas uno o te unes.')}
      </p>
      <Card className="space-y-3 text-left">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Ana, Ben, Dani…"
          className="field min-h-14! text-lg font-semibold"
        />
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>{t('Tu cuenta')}</span>
          <KeyHint address={address} />
        </div>
        {invalid && <p className="text-xs text-neg-600">{invalid}</p>}
        <Button type="submit" className="w-full" disabled={!draft.trim() || !!invalid}>
          {t('Continuar')}
        </Button>
      </Card>
      <button type="button" onClick={onSkip} className="btn btn-text text-ink-700!">
        {t('Ahora no')}
      </button>
    </form>
  )
}
