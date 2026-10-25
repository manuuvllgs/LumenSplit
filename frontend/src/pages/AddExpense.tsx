import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addExpense, getGroup } from '../lib/lumensplit'
import { formatAmount, parseAmount, TOKEN_SYMBOL } from '../lib/format'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Avatar, Button, Card, ErrorBox, Loading, MemberName, PageHeader, TxStatus } from '../components/ui'

export default function AddExpense() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const navigate = useNavigate()
  const { state, run, busy } = useTx()
  const { data: group, error, loading } = useAsync(() => getGroup(id), [id])
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (group) setSelected(new Set(group.members))
  }, [group])

  if (loading && !group) return <Loading />
  if (error || !group) return <ErrorBox message={error ?? 'No se pudo cargar el grupo'} />

  const amount = parseAmount(amountStr)
  const participants = group.members.filter((m) => selected.has(m))
  const share = amount && participants.length ? amount / BigInt(participants.length) : null
  const canSubmit = !!me && description.trim() && amount && participants.length > 0 && !busy

  const toggle = (m: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(m)) n.delete(m)
      else n.add(m)
      return n
    })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !me || !amount) return
    const res = await run((opts) => addExpense(id, me, amount, description.trim(), participants, opts))
    if (res) setTimeout(() => navigate(`/g/${id}`), 1200)
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="Añadir gasto" back={`/g/${id}`} />
      <Card className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Descripción</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cena, taxi, entradas…"
            maxLength={60}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 focus:border-brand-600 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Importe</span>
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
          {amountStr && !amount && <p className="mt-1 text-xs text-neg-600">Importe no válido (máx. 7 decimales).</p>}
        </label>
        <div>
          <span className="text-sm font-medium text-ink-700">Pagado por</span>
          <div className="mt-1 rounded-xl bg-ink-50 px-3 py-2 text-sm font-medium">Tú</div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-700">Se reparte entre</span>
            <button
              type="button"
              className="text-xs font-semibold text-brand-700"
              onClick={() => setSelected(selected.size === group.members.length ? new Set() : new Set(group.members))}
            >
              {selected.size === group.members.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="mt-1 divide-y divide-ink-100 rounded-xl ring-1 ring-ink-100">
            {group.members.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                <input type="checkbox" checked={selected.has(m)} onChange={() => toggle(m)} className="h-4 w-4 accent-brand-600" />
                <Avatar address={m} />
                <div className="min-w-0 flex-1">
                  <MemberName address={m} me={me} />
                </div>
                {selected.has(m) && share !== null && (
                  <span className="text-sm tabular-nums text-ink-500">≈ {formatAmount(share, true, 2)}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      </Card>
      <div className="mt-4 space-y-3">
        <TxStatus state={state} successText="Gasto añadido" />
        <Button type="submit" className="w-full py-3" disabled={!canSubmit} loading={busy}>
          Guardar gasto
        </Button>
      </div>
    </form>
  )
}
