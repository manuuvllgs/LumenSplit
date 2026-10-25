import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addExpense, addExpenseCustom, getGroup } from '../lib/lumensplit'
import { formatAmount, parseAmount, TOKEN_SYMBOL } from '../lib/format'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Avatar, Button, Card, ErrorBox, Loading, MemberName, PageHeader, TxStatus } from '../components/ui'
import { t } from '../i18n'

type Mode = 'equal' | 'custom'

export default function AddExpense() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const navigate = useNavigate()
  const { state, run, busy } = useTx()
  const { data: group, error, loading } = useAsync(() => getGroup(id), [id])
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<Mode>('equal')
  const [amountStr, setAmountStr] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (group) setSelected(new Set(group.members))
  }, [group])

  if (loading && !group) return <Loading />
  if (error || !group) return <ErrorBox message={error ?? t('No se pudo cargar el grupo')} />

  const participants = group.members.filter((m) => selected.has(m))

  // Equal split
  const amount = parseAmount(amountStr)
  const share = amount && participants.length ? amount / BigInt(participants.length) : null

  // Custom split: every selected person needs a valid amount > 0
  const customParsed = participants.map((m) => parseAmount(custom[m] ?? ''))
  const customValid = participants.length > 0 && customParsed.every((v) => v !== null)
  const customTotal = customParsed.reduce<bigint>((s, v) => s + (v ?? 0n), 0n)

  const canSubmit =
    !!me &&
    !!description.trim() &&
    participants.length > 0 &&
    !busy &&
    (mode === 'equal' ? !!amount : customValid)

  const toggle = (m: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(m)) n.delete(m)
      else n.add(m)
      return n
    })

  function switchMode(next: Mode) {
    // Start the custom split from the equal one so nobody types from scratch.
    if (next === 'custom' && share !== null && Object.keys(custom).length === 0) {
      setCustom(Object.fromEntries(participants.map((m) => [m, formatAmount(share, false, 2)])))
    }
    setMode(next)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !me) return
    const desc = description.trim()
    const res =
      mode === 'equal'
        ? await run((opts) => addExpense(id, me, amount!, desc, participants, opts))
        : await run((opts) =>
            addExpenseCustom(
              id,
              desc,
              participants.map((m) => ({ address: m, amount: (custom[m] ?? '').trim() })),
              opts,
            ),
          )
    if (res) setTimeout(() => navigate(`/g/${id}`), 1200)
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title={t('Añadir gasto')} back={`/g/${id}`} />
      <Card className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">{t('Descripción')}</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('Cena, taxi, entradas…')}
            maxLength={60}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 focus:border-brand-600 focus:outline-none"
          />
        </label>

        <div role="radiogroup" aria-label={t('Tipo de reparto')} className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
          {(
            [
              ['equal', 'A partes iguales'],
              ['custom', 'Importes distintos'],
            ] as const
          ).map(([m, text]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {t(text)}
            </button>
          ))}
        </div>

        {mode === 'equal' ? (
          <label className="block">
            <span className="text-sm font-medium text-ink-700">{t('Importe')}</span>
            <div className="mt-1 flex items-center rounded-xl border border-ink-200 focus-within:border-brand-600">
              <input
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-lg font-semibold tabular-nums focus:outline-none"
              />
              <span className="pr-3 text-sm font-semibold text-ink-500">{TOKEN_SYMBOL}</span>
            </div>
            {amountStr && !amount && <p className="mt-1 text-xs text-neg-600">{t('Importe no válido (máx. 7 decimales).')}</p>}
          </label>
        ) : (
          <div className="flex items-baseline justify-between rounded-xl bg-ink-50 px-3 py-2.5">
            <span className="text-sm font-medium text-ink-700">{t('Total')}</span>
            <span className="font-display text-lg font-bold tabular-nums">{formatAmount(customTotal)}</span>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-ink-700">{t('Pagado por')}</span>
          <div className="mt-1 rounded-xl bg-ink-50 px-3 py-2 text-sm font-medium">{t('Tú')}</div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-700">
              {mode === 'equal' ? t('Se reparte entre') : t('¿Cuánto pone cada uno?')}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-brand-700"
              onClick={() => setSelected(selected.size === group.members.length ? new Set() : new Set(group.members))}
            >
              {selected.size === group.members.length ? t('Ninguno') : t('Todos')}
            </button>
          </div>
          <div className="mt-1 divide-y divide-ink-100 rounded-xl ring-1 ring-ink-100">
            {group.members.map((m) => {
              const on = selected.has(m)
              const raw = custom[m] ?? ''
              const bad = mode === 'custom' && on && raw.trim() !== '' && parseAmount(raw) === null
              return (
                <div key={m} className="flex items-center gap-3 px-3 py-2.5">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(m)} className="h-4 w-4 accent-brand-600" />
                    <Avatar address={m} />
                    <div className="min-w-0 flex-1">
                      <MemberName address={m} me={me} />
                    </div>
                  </label>
                  {mode === 'equal' && on && share !== null && (
                    <span className="text-sm tabular-nums text-ink-500">≈ {formatAmount(share, true, 2)}</span>
                  )}
                  {mode === 'custom' && on && (
                    <input
                      value={raw}
                      onChange={(e) => setCustom((c) => ({ ...c, [m]: e.target.value }))}
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label={t('Importe de esta persona')}
                      className={`w-24 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold tabular-nums focus:outline-none ${
                        bad ? 'border-neg-600' : 'border-ink-200 focus:border-brand-600'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {mode === 'custom' && participants.length > 0 && !customValid && (
            <p className="mt-1 text-xs text-ink-500">{t('Pon un importe mayor que 0 a cada persona marcada.')}</p>
          )}
        </div>
      </Card>
      <div className="mt-4 space-y-3">
        <TxStatus state={state} successText={t('Gasto añadido')} />
        <Button type="submit" className="w-full py-3" disabled={!canSubmit} loading={busy}>
          {t('Guardar gasto')}{mode === 'custom' && customValid ? ` · ${formatAmount(customTotal)}` : ''}
        </Button>
      </div>
    </form>
  )
}
