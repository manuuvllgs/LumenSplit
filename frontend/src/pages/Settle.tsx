import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGroup, isMock, settle, suggestSettlements, type Transfer } from '../lib/lumensplit'
import { getAssetBalance, PAY_ASSET, quotePayIn, swapToXlm, type Quote } from '../lib/pathpay'
import { humanizeError } from '../lib/errors'
import { useDisplayName } from '../lib/aliases'
import { explorerTxUrl, formatDecimalString, toDecimalString, TOKEN_SYMBOL } from '../lib/format'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Amount, Avatar, Button, Card, ErrorBox, Loading, PageHeader, Spinner, TxStatus } from '../components/ui'

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

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar el grupo'} />
  const [group, transfers] = data
  const label = (a: string) => (a === me ? 'Tú' : name(a))

  return (
    <div className="space-y-4">
      <PageHeader title="Saldar cuentas" back={`/g/${id}`} />
      <p className="text-sm text-ink-500">
        Los mínimos pagos para que en <b>{group.name}</b> todos queden en paz. Paga los tuyos con un toque: el dinero
        llega al momento por Stellar.
      </p>
      {receipts.map((r) => (
        <Card key={r.hash} className="flex items-center gap-3 bg-pos-50! ring-pos-600/20!">
          <span className="text-pos-700">✓</span>
          <div className="min-w-0 flex-1 text-sm">
            Pagaste <Amount value={r.amount} /> a <b>{label(r.to)}</b>
            <div className="text-xs text-ink-500">
              {r.swapHash ? 'en euros · ' : ''}confirmado en{' '}
              {r.seconds.toLocaleString('es-ES', { maximumFractionDigits: 1 })} s
              {r.swapHash && (
                <>
                  {' · '}
                  <a href={explorerTxUrl(r.swapHash)} target="_blank" rel="noreferrer" className="underline">
                    conversión ↗
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
          <div className="mt-2 font-semibold">¡Todo saldado!</div>
          <div className="text-sm text-ink-500">Nadie debe nada en este grupo.</div>
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
        message: `${humanizeError(e)} Los euros ya están convertidos a ${TOKEN_SYMBOL} en tu cuenta: pulsa "Pagar" para terminar.`,
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
            <b>{label(t.from)}</b> {mine ? 'pagas' : 'paga'} a <b>{label(t.to)}</b>
          </div>
          <Amount value={t.amount} className="text-base" />
        </div>
        {mine && !finished && (
          <div className={`grid gap-2 ${euroEnabled ? 'grid-cols-2' : ''}`}>
            <Button variant="accent" onClick={pay} loading={busy} disabled={anyBusy}>
              Pagar
            </Button>
            {euroEnabled && (
              <Button variant="secondary" onClick={payInEuros} loading={euroBusy} disabled={anyBusy || !quote}>
                Pagar en euros
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
                {eurBalance !== null && ` · tienes ${formatDecimalString(eurBalance)} ${PAY_ASSET.code}`}
              </>
            ) : quoteError ? (
              <span className="text-neg-600">{quoteError}</span>
            ) : (
              'Calculando precio en euros…'
            )}
          </div>
        )}
        <TxStatus state={state} successText="Pago enviado" />
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
      Conversión ↗
    </a>
  )
  if (euro.step === 'swap' || euro.step === 'settle') {
    return (
      <div className="space-y-1 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
        <div className="flex items-center gap-2">
          {euro.step === 'swap' ? <Spinner /> : <span>✓</span>} 1/2 Convirtiendo euros… {swapLink}
        </div>
        {euro.step === 'settle' && (
          <div className="flex items-center gap-2">
            <Spinner /> 2/2 Pagando a {to}…
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
      ✓ Pagado en euros. {swapLink} ·{' '}
      <a href={explorerTxUrl(euro.settleHash)} target="_blank" rel="noreferrer" className="font-semibold underline">
        Pago a {to} ↗
      </a>
    </div>
  )
}
