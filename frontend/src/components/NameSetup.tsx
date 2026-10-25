import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { setChosenName, useChosenName } from '../lib/aliases'
import { MAX_NAME_LENGTH, saveMyName, validateName } from '../lib/profile'
import { useWallet } from '../wallet'
import { useTx } from '../useTx'
import { Button, Card, KeyHint, Loading, TxStatus } from './ui'

const SKIP_KEY = 'lumensplit.skipName'

/** First visit with a wallet that has no name yet → ask for one before anything else. */
export function NameGate({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  const name = useChosenName(address)
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
  const { state, run, busy } = useTx()
  const invalid = draft ? validateName(draft) : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (validateName(draft)) return
    const res = await run((opts) => saveMyName(address, draft, opts))
    if (res) setTimeout(() => setChosenName(address, draft), 900)
  }

  return (
    <form onSubmit={save} className="space-y-5 pt-8 text-center">
      <div className="text-4xl">👋</div>
      <h1 className="text-3xl font-bold">¿Cómo te llamas?</h1>
      <p className="mx-auto max-w-xs text-sm text-ink-500">
        Es el nombre que verán tus amigos en los grupos en lugar de tu dirección. Lo eliges tú y se guarda en tu propia
        cuenta de Stellar.
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
        <TxStatus state={state} successText="Nombre guardado" />
        <Button type="submit" className="w-full py-3" disabled={!draft.trim() || !!invalid} loading={busy}>
          Guardar mi nombre
        </Button>
      </Card>
      <button type="button" onClick={onSkip} disabled={busy} className="text-sm text-ink-500 underline">
        Ahora no
      </button>
    </form>
  )
}
