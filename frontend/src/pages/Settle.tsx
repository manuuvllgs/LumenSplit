import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGroup, settle, suggestSettlements, type Transfer } from '../lib/lumensplit'
import { useDisplayName } from '../lib/aliases'
import { explorerTxUrl } from '../lib/format'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Amount, Avatar, Button, Card, ErrorBox, Loading, PageHeader, TxStatus } from '../components/ui'

export default function Settle() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const name = useDisplayName()
  const { data, error, loading, reload } = useAsync(() => Promise.all([getGroup(id), suggestSettlements(id)]), [id])
  const [receipts, setReceipts] = useState<(Transfer & { hash: string })[]>([])

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar el grupo'} />
  const [group, transfers] = data
  const label = (a: string) => (a === me ? 'Tú' : name(a))

  return (
    <div className="space-y-4">
      <PageHeader title="Saldar cuentas" back={`/g/${id}`} />
      <p className="text-sm text-ink-500">
        La lista mínima de pagos para que en <b>{group.name}</b> todos queden a cero. Paga los tuyos con un clic: el
        dinero se mueve en Stellar.
      </p>
      {receipts.map((r) => (
        <Card key={r.hash} className="flex items-center gap-3 bg-pos-50 ring-pos-600/20">
          <span className="text-pos-700">✓</span>
          <div className="min-w-0 flex-1 text-sm">
            Pagaste <Amount value={r.amount} /> a <b>{label(r.to)}</b>
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
              onPaid={(hash) => {
                setReceipts((rs) => [{ ...t, hash }, ...rs])
                void reload()
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

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
  onPaid: (hash: string) => void
}) {
  const { state, run, busy } = useTx()
  const mine = t.from === me

  async function pay() {
    if (!me) return
    const res = await run((opts) => settle(groupId, me, t.to, t.amount, opts))
    if (res) setTimeout(() => onPaid(res.hash), 1500)
  }

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
        {mine && state.status !== 'done' && (
          <Button className="w-full" onClick={pay} loading={busy}>
            Pagar
          </Button>
        )}
        <TxStatus state={state} successText="Pago enviado" />
      </Card>
    </li>
  )
}
