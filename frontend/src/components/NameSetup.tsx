import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { setMyName, useMyName } from '../lib/aliases'
import { MAX_NAME_LENGTH, validateName } from '../lib/profile'
import { useWallet } from '../wallet'
import { Button, Card, KeyHint, Loading } from './ui'

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
  if (!address || pathname.startsWith('/join/') || skipped) return children
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
    <form onSubmit={save} className="space-y-5 pt-8 text-center">
      <div className="text-4xl">👋</div>
      <h1 className="text-3xl font-bold">¿Cómo te llamas?</h1>
      <p className="mx-auto max-w-xs text-sm text-ink-500">
        Es el nombre que verán tus amigos en lugar de tu dirección. Se guarda en este dispositivo y lo compartimos con
        tus grupos cuando creas uno o te unes.
      </p>
      <Card className="space-y-3 text-left">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Ana, Ben, Dani…"
          className="w-full rounded-xl border border-ink-200 px-3 py-3 text-lg font-semibold focus:border-brand-600 focus:outline-none"
        />
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>Tu cuenta</span>
          <KeyHint address={address} />
        </div>
        {invalid && <p className="text-xs text-neg-600">{invalid}</p>}
        <Button type="submit" className="w-full py-3" disabled={!draft.trim() || !!invalid}>
          Continuar
        </Button>
      </Card>
      <button type="button" onClick={onSkip} className="text-sm text-ink-500 underline">
        Ahora no
      </button>
    </form>
  )
}
