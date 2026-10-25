import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { setChosenName, useNames } from '../lib/aliases'
import { humanizeError } from '../lib/errors'
import { MAX_NAME_LENGTH, saveMyName, validateName } from '../lib/profile'
import { explorerTxUrl, formatAmount, shortAddress } from '../lib/format'
import type { TxState } from '../useTx'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost'

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    accent: 'bg-accent-400 text-ink-900 hover:bg-accent-500 shadow-sm',
    secondary: 'bg-white text-ink-900 ring-1 ring-ink-200 hover:bg-ink-50',
    ghost: 'text-brand-700 hover:bg-brand-50',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-100 ${className}`}>{children}</div>
}

export function PageHeader({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {back && (
        <Link to={back} className="-ml-2 rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Volver">
          ←
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-bold text-ink-900">{title}</h1>
      {right}
    </div>
  )
}

export function Amount({ value, signed = false, className = '' }: { value: bigint; signed?: boolean; className?: string }) {
  const color = !signed || value === 0n ? 'text-ink-700' : value > 0n ? 'text-pos-600' : 'text-neg-600'
  const text = signed && value > 0n ? `+${formatAmount(value, true, 2)}` : formatAmount(value, true, 2)
  return <span className={`font-display font-bold tabular-nums ${color} ${className}`}>{text}</span>
}

export function Avatar({ address }: { address: string }) {
  const names = useNames([address])
  const label = names[address] ?? address.slice(1, 3)
  let h = 0
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: `hsl(${h} 55% 50%)` }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** The Stellar key in small grey mono, shown under a person's name. Full key on hover. */
export function KeyHint({ address, className = '' }: { address: string; className?: string }) {
  return (
    <span className={`font-mono text-[11px] font-normal leading-tight text-ink-400 ${className}`} title={address}>
      {shortAddress(address)}
    </span>
  )
}

/**
 * A person: their chosen name in black with the key small and grey underneath.
 * On your own row (`editable`) the pencil changes your name on your Stellar account.
 */
export function MemberName({ address, me, editable = false }: { address: string; me?: string | null; editable?: boolean }) {
  const names = useNames([address])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const name = names[address]
  const isMe = !!me && address === me

  async function save() {
    if (!me || draft.trim() === (name ?? '')) return setEditing(false)
    const invalid = validateName(draft)
    if (invalid) return setError(invalid)
    setSaving(true)
    setError(null)
    try {
      await saveMyName(me, draft)
      setChosenName(me, draft)
      setEditing(false)
    } catch (e) {
      setError(humanizeError(e))
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tu nombre"
            disabled={saving}
            className="w-32 rounded-md border border-ink-200 px-2 py-0.5 text-sm"
          />
          <Button type="submit" variant="ghost" className="px-2! py-0.5!" loading={saving}>
            {saving ? 'Firma…' : 'Guardar'}
          </Button>
          {!saving && (
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-400">
              ✕
            </button>
          )}
        </span>
        {error && <span className="text-xs text-neg-600">{error}</span>}
      </form>
    )
  }

  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="flex items-center gap-1 truncate font-medium text-ink-900">
        {name ?? <span className="text-ink-500">Sin nombre</span>}
        {isMe && <span className="rounded bg-brand-100 px-1.5 text-[10px] font-semibold text-brand-700">TÚ</span>}
        {editable && isMe && (
          <button
            type="button"
            onClick={() => {
              setDraft(name ?? '')
              setError(null)
              setEditing(true)
            }}
            className="text-xs text-ink-400 hover:text-brand-600"
            title="Cambiar mi nombre"
          >
            ✎
          </button>
        )}
      </span>
      <KeyHint address={address} />
    </span>
  )
}

const PHASE_TEXT = {
  signing: 'Confirma en Freighter…',
  submitting: 'Enviando por Stellar…',
}

export function TxStatus({ state, successText = 'Hecho' }: { state: TxState; successText?: string }) {
  if (state.status === 'idle') return null
  if (state.status === 'signing' || state.status === 'submitting') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
        <Spinner /> {PHASE_TEXT[state.status]}
      </div>
    )
  }
  if (state.status === 'error') {
    return <div className="rounded-xl bg-neg-50 p-3 text-sm text-neg-700">⚠ {state.message}</div>
  }
  return (
    <div className="rounded-xl bg-pos-50 p-3 text-sm text-pos-700">
      ✓ {successText}.{' '}
      <a href={explorerTxUrl(state.hash)} target="_blank" rel="noreferrer" className="font-semibold underline">
        Ver en stellar.expert ↗
      </a>
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl bg-neg-50 p-3 text-sm text-neg-700">⚠ {message}</div>
}

export function Loading() {
  return (
    <div className="flex justify-center py-12 text-brand-600">
      <Spinner className="h-6 w-6" />
    </div>
  )
}
