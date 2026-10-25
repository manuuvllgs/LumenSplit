import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBalances, getExpenses, getGroup, type Expense } from '../lib/lumensplit'
import { formatAmount, formatDate } from '../lib/format'
import { useDisplayName } from '../lib/aliases'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Amount, Avatar, Button, Card, ErrorBox, KeyHint, Loading, MemberName, PageHeader } from '../components/ui'
import { InviteModal } from '../components/InviteModal'

/** Equal splits differ by at most 1 stroop (remainder), so anything wider is a custom split. */
function isCustomSplit(e: Expense): boolean {
  if (!e.shares || e.shares.length < 2) return false
  let min = e.shares[0]
  let max = e.shares[0]
  for (const s of e.shares) {
    if (s < min) min = s
    if (s > max) max = s
  }
  return max - min > 1n
}

export default function GroupDetail() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const name = useDisplayName()
  const [inviting, setInviting] = useState(false)
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([getGroup(id), getBalances(id), getExpenses(id)]),
    [id],
  )

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar el grupo'} />
  const [group, balances, expenses] = data
  const mine = me ? (balances[me] ?? 0n) : 0n
  const total = expenses.reduce((s, e) => s + e.amount, 0n)
  const unsettled = Object.values(balances).some((b) => b !== 0n)

  return (
    <div className="space-y-5">
      <PageHeader
        title={group.name}
        back="/"
        right={
          <Button variant="ghost" onClick={() => setInviting(true)}>
            + Invitar
          </Button>
        }
      />
      {inviting && (
        <InviteModal
          groupId={id}
          groupName={group.name}
          onClose={() => {
            setInviting(false)
            void reload()
          }}
        />
      )}

      <Card className="bg-ink-900! text-white ring-0!">
        <div className="text-sm opacity-80">Tu saldo</div>
        <div className="mt-1 font-display text-4xl font-bold tabular-nums">
          {mine === 0n ? 'Estás en paz' : <Amount value={mine} signed className={mine > 0n ? 'text-[#4ade80]!' : 'text-[#ff8a80]!'} />}
        </div>
        <div className="mt-1 text-sm opacity-80">
          {mine > 0n ? 'Te deben dinero' : mine < 0n ? 'Debes dinero' : 'No debes nada'} · Gasto total{' '}
          <Amount value={total} className="text-white! font-normal!" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/g/${id}/expense`}>
          <Button className="w-full">+ Añadir gasto</Button>
        </Link>
        {unsettled ? (
          <Link to={`/g/${id}/settle`}>
            <Button variant="accent" className="w-full">
              Saldar cuentas
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Todo saldado
          </Button>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Saldos</h2>
          <button onClick={() => setInviting(true)} className="text-sm font-semibold text-brand-700 hover:underline">
            Invitar amigos
          </button>
        </div>
        <Card className="divide-y divide-ink-100 p-0">
          {group.members.map((m) => (
            <div key={m} className="flex items-center gap-3 px-4 py-3">
              <Avatar address={m} />
              <div className="min-w-0 flex-1">
                <MemberName address={m} me={me} editable />
              </div>
              <Amount value={balances[m] ?? 0n} signed />
            </div>
          ))}
          {group.members.length === 1 && (
            <button
              onClick={() => setInviting(true)}
              className="w-full px-4 py-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Estás solo en el grupo. Invita a tus amigos con un enlace o QR →
            </button>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Gastos</h2>
        {expenses.length === 0 ? (
          <Card className="py-8 text-center text-ink-500">Todavía no hay gastos.</Card>
        ) : (
          <Card className="divide-y divide-ink-100 p-0">
            {[...expenses].reverse().map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Avatar address={e.payer} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.description}</div>
                  <div className="text-xs text-ink-500">
                    Pagó <b className="text-ink-900">{e.payer === me ? 'tú' : name(e.payer)}</b> · {e.participants.length}{' '}
                    personas · {formatDate(e.timestamp)}
                  </div>
                  <KeyHint address={e.payer} />
                  {isCustomSplit(e) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.participants.map((p, j) => (
                        <span key={p} title={p} className="flex flex-col rounded-lg bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">
                          <span>
                            <b className="text-ink-900">{p === me ? 'Tú' : name(p)}</b> {formatAmount(e.shares![j], false, 2)}
                          </span>
                          <KeyHint address={p} className="text-[10px]" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Amount value={e.amount} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
