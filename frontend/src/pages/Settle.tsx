import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGroup, isMock, settle, settleAll, suggestSettlements, type Transfer } from '../lib/lumensplit'
import { getAssetBalance, PAY_ASSET, quotePayIn, swapToXlm, type Quote } from '../lib/pathpay'
import { humanizeError } from '../lib/errors'
import { useDisplayName } from '../lib/aliases'
import { explorerTxUrl, formatAmount, formatDecimalString, toDecimalString, TOKEN_SYMBOL } from '../lib/format'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Amount, Avatar, Button, Card, ErrorBox, KeyHint, Loading, PageHeader, Spinner, TxStatus } from '../components/ui'
import { locale, t as tx } from '../i18n'

interface Receipt extends Transfer {
  hash: string
  seconds: number
  swapHash?: string
}

export default function Settle() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const name = useDisplayName()
  const { data, error, loading, reload } = useAsync(() => Promise.all([getGroup(id), suggestSettlements(id)]), [id])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [allReceipt, setAllReceipt] = useState<AllReceipt | null>(null)

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? tx('No se pudo cargar el grupo')} />
  const [group, transfers] = data
  const label = (a: string) => (a === me ? tx('Tú') : name(a))

  return (
    <div className="space-y-4">
      <PageHeader title={tx('Saldar cuentas')} back={`/g/${id}`} />
      <p className="text-sm text-ink-500">
        {tx('Los mínimos pagos para que en {group} todos queden en paz. Paga los tuyos con un toque: el dinero llega al momento por Stellar.', { group: group.name })}
      </p>
      {allReceipt && <SettleAllReceipt receipt={allReceipt} label={label} />}
      {me && !allReceipt && (
        <SettleAllCard
          groupId={id}
          mine={transfers.filter((t) => t.from === me)}
          onPaid={(r) => {
            setAllReceipt(r)
            void reload()
          }}
        />
      )}
      {receipts.map((r) => (
        <Card key={r.hash} className="flex items-center gap-3 bg-pos-50! ring-pos-600/20!">
          <span className="text-pos-700">✓</span>
          <div className="min-w-0 flex-1 text-sm">
            {tx('Pagaste')} <Amount value={r.amount} /> {tx('a')} <b>{label(r.to)}</b>
            <KeyHint address={r.to} className="block" />
            <div className="text-xs text-ink-500">
              {r.swapHash ? tx('en euros · ') : ''}{tx('confirmado en')}{' '}
              {r.seconds.toLocaleString(locale(), { maximumFractionDigits: 1 })} s
              {r.swapHash && (
                <>
                  {' · '}
                  <a href={explorerTxUrl(r.swapHash)} target="_blank" rel="noreferrer" className="underline">
                    {tx('conversión ↗')}
                  </a>
                </>
              )}
            </div>
          </div>
          <a href={explorerTxUrl(r.hash)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-pos-700 underline">
            stellar.expert ↗
          </a>
        </Card>
      ))}
      {transfers.length === 0 ? (
        <Card className="py-10 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 font-semibold">{tx('¡Todo saldado!')}</div>
          <div className="text-sm text-ink-500">{tx('Nadie debe nada en este grupo.')}</div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {transfers.map((t) => (
            <TransferRow
              key={`${t.from}-${t.to}`}
              t={t}
              groupId={id}
              me={me}
              label={label}
              onPaid={(hash, seconds, swapHash) => {
                setReceipts((rs) => [{ ...t, hash, seconds, swapHash }, ...rs])
                void reload()
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface AllReceipt {
  hash: string
  seconds: number
  transfers: { to: string; amount: string }[]
}

/** "Saldar todo": every debt I have in the group, one signature, one atomic transaction. */
function SettleAllCard({
  groupId,
  mine,
  onPaid,
}: {
  groupId: number
  mine: Transfer[]
  onPaid: (r: AllReceipt) => void
}) {
  const { state, run, busy } = useTx()
  if (mine.length === 0) return null
  const total = mine.reduce((sum, t) => sum + t.amount, 0n)
  const people = mine.length === 1 ? tx('1 persona') : tx('{n} personas', { n: mine.length })

  async function payAll() {
    const started = performance.now()
    const res = await run((opts) => settleAll(groupId, opts))
    if (!res) return
    const seconds = (performance.now() - started) / 1000
    setTimeout(() => onPaid({ hash: res.hash, seconds, transfers: res.transfers }), 1200)
  }

  return (
    <div className="space-y-3 rounded-2xl bg-ink-900 p-4 text-white shadow-sm">
      <div>
        <div className="text-xs text-white/70">{tx('Debes en total')}</div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-3xl font-bold tabular-nums text-accent-400">{formatAmount(total, true, 2)}</span>
          <span className="text-xs text-white/70">{tx('a {people}', { people })}</span>
        </div>
      </div>
      <Button variant="accent" className="w-full" onClick={payAll} loading={busy} disabled={busy || state.status === 'done'}>
        {tx('Saldar todo ({amount} a {people})', { amount: formatAmount(total, true, 2), people })}
      </Button>
      {state.status === 'idle' && <p className="text-xs text-white/70">{tx('Una sola firma en Freighter: todos los pagos van juntos.')}</p>}
      <TxStatus state={state} successText={tx('Todo pagado')} />
    </div>
  )
}

function SettleAllReceipt({ receipt, label }: { receipt: AllReceipt; label: (a: string) => string }) {
  const n = receipt.transfers.length
  return (
    <Card className="space-y-2 bg-pos-50! ring-pos-600/20!">
      <div className="flex items-center gap-2 font-semibold text-pos-700">
        <span>✓</span>
        {n === 1 ? tx('1 pago') : tx('{n} pagos', { n })} {tx('en una sola transacción ·')}{' '}
        {receipt.seconds.toLocaleString(locale(), { maximumFractionDigits: 1 })} s
      </div>
      <ul className="space-y-1 text-sm">
        {receipt.transfers.map((t) => (
          <li key={t.to} className="flex justify-between">
            <span className="flex flex-col">
              <span>
                {tx('Pagaste a')} <b>{label(t.to)}</b>
              </span>
              <KeyHint address={t.to} />
            </span>
            <span className="font-display font-bold tabular-nums">
              {formatDecimalString(t.amount)} {TOKEN_SYMBOL}
            </span>
          </li>
        ))}
      </ul>
      <a href={explorerTxUrl(receipt.hash)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-pos-700 underline">
        {tx('Ver en stellar.expert ↗')}
      </a>
    </Card>
  )
}

type EuroState =
  | { step: 'idle' }
  | { step: 'swap' }
  | { step: 'settle'; swapHash: string }
  | { step: 'done'; swapHash: string; settleHash: string }
  | { step: 'error'; message: string; swapHash?: string }

function TransferRow({
  t,
  groupId,
  me,
  label,
  onPaid,
}: {
  t: Transfer
  groupId: number
  me: string | null
  label: (a: string) => string
  onPaid: (hash: string, seconds: number, swapHash?: string) => void
}) {
  const { state, run, busy } = useTx()
  const mine = t.from === me
  // Pay-in-euros goes through Horizon on testnet, so it is hidden in mock mode.
  const euroEnabled = mine && !!PAY_ASSET && !isMock
  const xlm = toDecimalString(t.amount)

  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [eurBalance, setEurBalance] = useState<string | null>(null)
  const [euro, setEuro] = useState<EuroState>({ step: 'idle' })
  const euroBusy = euro.step === 'swap' || euro.step === 'settle'

  const loadQuote = useCallback(async () => {
    if (!euroEnabled || !PAY_ASSET || !me) return
    setQuoteError(null)
    getAssetBalance(me, PAY_ASSET).then(setEurBalance, () => setEurBalance(null))
    try {
      setQuote(await quotePayIn(PAY_ASSET, xlm))
    } catch (e) {
      setQuote(null)
      setQuoteError(e instanceof Error ? e.message : String(e))
    }
  }, [euroEnabled, me, xlm])

  useEffect(() => {
    void loadQuote()
  }, [loadQuote])

  async function pay() {
    if (!me) return
    const started = performance.now()
    const res = await run((opts) => settle(groupId, me, t.to, t.amount, opts))
    if (!res) return
    const seconds = (performance.now() - started) / 1000
    setTimeout(() => onPaid(res.hash, seconds), 1500)
  }

  async function payInEuros() {
    if (!me || !PAY_ASSET || !quote) return
    const started = performance.now()
    setEuro({ step: 'swap' })
    let swapHash: string
    try {
      swapHash = (await swapToXlm(me, PAY_ASSET, xlm, quote)).hash
    } catch (e) {
      // Messages from pathpay.ts are already readable ("Not enough EURT…", "The price moved…").
      setEuro({ step: 'error', message: e instanceof Error ? e.message : String(e) })
      void loadQuote()
      return
    }
    setEuro({ step: 'settle', swapHash })
    try {
      const { hash } = await settle(groupId, me, t.to, t.amount)
      setEuro({ step: 'done', swapHash, settleHash: hash })
      const seconds = (performance.now() - started) / 1000
      setTimeout(() => onPaid(hash, seconds, swapHash), 1500)
    } catch (e) {
      setEuro({
        step: 'error',
        swapHash,
        message: `${humanizeError(e)} ${tx('Los euros ya están convertidos a {sym} en tu cuenta: pulsa "Pagar" para terminar.', { sym: TOKEN_SYMBOL })}`,
      })
    }
  }

  const anyBusy = busy || euroBusy
  const finished = state.status === 'done' || euro.step === 'done'

  return (
    <li>
      <Card className={`space-y-3 ${mine ? 'ring-2 ring-brand-600' : ''}`}>
        <div className="flex items-center gap-2">
          <Avatar address={t.from} />
          <span className="text-ink-400">→</span>
          <Avatar address={t.to} />
          <div className="min-w-0 flex-1 text-sm">
            <div>
              <b>{label(t.from)}</b> {mine ? tx('pagas a') : tx('paga a')} <b>{label(t.to)}</b>
            </div>
            <div className="flex items-center gap-1">
              <KeyHint address={t.from} />
              <span className="text-[11px] text-ink-400">→</span>
              <KeyHint address={t.to} />
            </div>
          </div>
          <Amount value={t.amount} className="text-base" />
        </div>
        {mine && !finished && (
          <div className={`grid gap-2 ${euroEnabled ? 'grid-cols-2' : ''}`}>
            <Button variant="accent" onClick={pay} loading={busy} disabled={anyBusy}>
              {tx('Pagar')}
            </Button>
            {euroEnabled && (
              <Button variant="secondary" onClick={payInEuros} loading={euroBusy} disabled={anyBusy || !quote}>
                {tx('Pagar en euros')}
              </Button>
            )}
          </div>
        )}
        {euroEnabled && PAY_ASSET && !finished && (
          <div className="text-xs text-ink-500">
            {quote ? (
              <>
                ≈{' '}
                <b className="text-ink-700">
                  {formatDecimalString(quote.sourceAmount)} {PAY_ASSET.code}
                </b>{' '}
                · {quote.route}
                {eurBalance !== null && ` · ${tx('tienes {amount}', { amount: `${formatDecimalString(eurBalance)} ${PAY_ASSET.code}` })}`}
              </>
            ) : quoteError ? (
              <span className="text-neg-600">{quoteError}</span>
            ) : (
              tx('Calculando precio en euros…')
            )}
          </div>
        )}
        <TxStatus state={state} successText={tx('Pago enviado')} />
        <EuroStatus euro={euro} to={label(t.to)} />
      </Card>
    </li>
  )
}

function EuroStatus({ euro, to }: { euro: EuroState; to: string }) {
  if (euro.step === 'idle') return null
  const swapHash = 'swapHash' in euro ? euro.swapHash : undefined
  const swapLink = swapHash && (
    <a href={explorerTxUrl(swapHash)} target="_blank" rel="noreferrer" className="font-semibold underline">
      {tx('Conversión ↗')}
    </a>
  )
  if (euro.step === 'swap' || euro.step === 'settle') {
    return (
      <div className="space-y-1 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
        <div className="flex items-center gap-2">
          {euro.step === 'swap' ? <Spinner /> : <span>✓</span>} {tx('1/2 Convirtiendo euros…')} {swapLink}
        </div>
        {euro.step === 'settle' && (
          <div className="flex items-center gap-2">
            <Spinner /> {tx('2/2 Pagando a {to}…', { to })}
          </div>
        )}
      </div>
    )
  }
  if (euro.step === 'error') {
    return (
      <div className="rounded-xl bg-neg-50 p-3 text-sm text-neg-700">
        ⚠ {euro.message} {swapLink}
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-pos-50 p-3 text-sm text-pos-700">
      ✓ {tx('Pagado en euros.')} {swapLink} ·{' '}
      <a href={explorerTxUrl(euro.settleHash)} target="_blank" rel="noreferrer" className="font-semibold underline">
        {tx('Pago a {to} ↗', { to })}
      </a>
    </div>
  )
}
