import { Link, useParams } from 'react-router-dom'
import { getBalances, getExpenses, getGroup } from '../lib/lumensplit'
import { formatDate } from '../lib/format'
import { useDisplayName } from '../lib/aliases'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Amount, Avatar, Button, Card, ErrorBox, Loading, MemberName, PageHeader } from '../components/ui'

export default function GroupDetail() {
  const id = Number(useParams().id)
  const { address: me } = useWallet()
  const name = useDisplayName()
  const { data, error, loading } = useAsync(
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
      <PageHeader title={group.name} back="/" />

      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white ring-0">
        <div className="text-sm opacity-80">Tu saldo</div>
        <div className="mt-1 text-3xl font-extrabold tabular-nums">
          {mine === 0n ? 'Estás en paz' : <Amount value={mine} signed className="text-white!" />}
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
            <Button variant="secondary" className="w-full">
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
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Saldos</h2>
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
                    Pagó {e.payer === me ? 'tú' : name(e.payer)} · {e.participants.length} personas ·{' '}
                    {formatDate(e.timestamp)}
                  </div>
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
