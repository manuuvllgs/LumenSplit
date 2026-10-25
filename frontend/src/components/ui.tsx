import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { publishMyNameIfNeeded, setMyName, useNames } from '../lib/aliases'
import { humanizeError } from '../lib/errors'
import { MAX_NAME_LENGTH, validateName } from '../lib/profile'
import { explorerTxUrl, formatAmount, shortAddress } from '../lib/format'
import type { TxState } from '../useTx'
import { t } from '../i18n'
import { formatEur, useXlmEur } from '../lib/price'

/**
 * Broadside controls on a Dusk system:
 * primary = ink block · accent = gold block (the one that moves money) ·
 * secondary = double-rule frame · ghost = underlined text.
 */
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary: 'btn btn-ink',
  accent: 'btn btn-gold',
  secondary: 'btn btn-frame',
  ghost: 'btn btn-text',
}

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={`${VARIANT[variant]} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

/** Small line icons, drawn in currentColor so they follow the mode. */
const ICONS = {
  back: <path d="M15 5l-7 7 7 7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <path d="M12 4l9 16H3L12 4zM12 10v4M12 17.5v.5" />,
  external: <path d="M14 5h5v5M19 5l-8 8M10 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4" />,
  sun: <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
} as const

export function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-ink-200 sm:p-5 ${className}`}>{children}</div>
}

export function PageHeader({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2 sm:mb-6">
      {back && (
        <Link
          to={back}
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-ink-700 hover:bg-ink-100"
          aria-label={t('Volver')}
        >
          <Icon name="back" className="h-5 w-5" />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-2xl text-ink-900 sm:text-3xl">{title}</h1>
      {right}
    </div>
  )
}

export function Amount({
  value,
  signed = false,
  className = '',
  eur = true,
}: {
  value: bigint
  signed?: boolean
  className?: string
  /** Show "≈ € …" next to it at today's XLM price. */
  eur?: boolean
}) {
  const xlmEur = useXlmEur()
  const color = !signed || value === 0n ? 'text-ink-700' : value > 0n ? 'text-pos-600' : 'text-neg-600'
  const text = signed && value > 0n ? `+${formatAmount(value, true, 2)}` : formatAmount(value, true, 2)
  return (
    <span className={`figure ${color} ${className}`}>
      {text}
      {eur && xlmEur !== null && value !== 0n && <EurHint value={value} rate={xlmEur} />}
    </span>
  )
}

/** Small, muted "≈ 3,13 €" that inherits the colour of the amount it follows. */
export function EurHint({ value, rate, className = '' }: { value: bigint; rate: number; className?: string }) {
  return (
    <span
      className={`ml-1.5 align-baseline text-[0.62em] font-medium whitespace-nowrap opacity-60 ${className}`}
      title={t('Valor aproximado en euros al precio actual del XLM')}
    >
      ≈ {formatEur(value, rate)}
    </span>
  )
}

/** Six avatar tints, all tokens, picked from the address so a person keeps their colour. */
const AVATAR_TINTS = 6

export function Avatar({ address }: { address: string }) {
  const names = useNames([address])
  const label = names[address] ?? address.slice(1, 3)
  let h = 0
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) % 997
  const tint = (h % AVATAR_TINTS) + 1
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold"
      style={{ background: `var(--av-${tint})`, color: `var(--on-av)` }}
      aria-hidden
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** The Stellar key in small grey mono, shown under a person's name. Full key on hover. */
export function KeyHint({ address, className = '' }: { address: string; className?: string }) {
  return (
    <span className={`key text-[11px] font-normal leading-tight text-ink-500 ${className}`} title={address}>
      {shortAddress(address)}
    </span>
  )
}

/**
 * A person: their chosen name in ink with the key small and grey underneath.
 * On your own row (`editable`) the pencil changes your name.
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
    setMyName(me, draft)
    setSaving(true)
    setError(null)
    try {
      await publishMyNameIfNeeded(me)
      setEditing(false)
    } catch (e) {
      setError(`${t('Guardado solo en este dispositivo.')} ${humanizeError(e)}`)
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
        <span className="flex flex-wrap items-center gap-1">
          <input
            autoFocus
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('Tu nombre')}
            disabled={saving}
            className="field min-h-10! w-36 text-sm"
          />
          <Button type="submit" variant="ghost" loading={saving}>
            {saving ? t('Firma…') : t('Guardar')}
          </Button>
          {!saving && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-10 w-10 items-center justify-center text-ink-500 hover:text-ink-900"
              aria-label={t('Cancelar')}
            >
              <Icon name="close" />
            </button>
          )}
        </span>
        {error && <span className="text-xs text-neg-600">{error}</span>}
      </form>
    )
  }

  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink-900">
        <span className="truncate">{name ?? <span className="text-ink-500">{t('Sin nombre')}</span>}</span>
        {isMe && (
          <span className="shrink-0 bg-accent-400 px-1.5 py-px font-control text-[10px] font-semibold text-on-accent">
            {t('TÚ')}
          </span>
        )}
        {editable && isMe && (
          <button
            type="button"
            onClick={() => {
              setDraft(name ?? '')
              setError(null)
              setEditing(true)
            }}
            className="-m-2 inline-flex h-9 w-9 shrink-0 items-center justify-center text-ink-500 hover:text-ink-900"
            title={t('Cambiar mi nombre')}
            aria-label={t('Cambiar mi nombre')}
          >
            <Icon name="edit" className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
      <KeyHint address={address} />
    </span>
  )
}

const PHASE_TEXT = {
  signing: () => t('Confirma en Freighter…'),
  submitting: () => t('Enviando por Stellar…'),
}

/** Status line for a transaction: a left rule in the state's colour, never a filled alert box. */
function StatusLine({ tone, icon, children }: { tone: 'info' | 'pos' | 'neg'; icon: ReactNode; children: ReactNode }) {
  const tones = {
    info: 'border-brand-600 bg-brand-50 text-brand-800',
    pos: 'border-pos-600 bg-pos-50 text-pos-700',
    neg: 'border-neg-600 bg-neg-50 text-neg-700',
  }
  return (
    <div role={tone === 'neg' ? 'alert' : 'status'} className={`flex items-start gap-2 border-l-4 px-3 py-2.5 text-sm ${tones[tone]}`}>
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function TxStatus({ state, successText }: { state: TxState; successText?: string }) {
  if (state.status === 'idle') return null
  if (state.status === 'signing' || state.status === 'submitting') {
    return <StatusLine tone="info" icon={<Spinner />}>{PHASE_TEXT[state.status]()}</StatusLine>
  }
  if (state.status === 'error') {
    return <StatusLine tone="neg" icon={<Icon name="alert" />}>{state.message}</StatusLine>
  }
  return (
    <StatusLine tone="pos" icon={<Icon name="check" />}>
      {successText ?? t('Hecho')}.{' '}
      <a href={explorerTxUrl(state.hash)} target="_blank" rel="noreferrer" className="key font-medium underline underline-offset-2">
        {t('Ver en stellar.expert ↗')}
      </a>
    </StatusLine>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <StatusLine tone="neg" icon={<Icon name="alert" />}>{message}</StatusLine>
}

export function Loading() {
  return (
    <div className="flex justify-center py-16 text-ink-500" role="status" aria-label={t('Cargando')}>
      <Spinner className="h-6 w-6" />
    </div>
  )
}
