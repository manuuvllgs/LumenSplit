import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { getGroup, joinGroup } from '../lib/lumensplit'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { useTx } from '../useTx'
import { Avatar, Button, Card, ErrorBox, Loading, TxStatus } from '../components/ui'

/** /join/:id#<code> — opened from an invite link or QR. Works before connecting a wallet. */
export default function Join() {
  const id = Number(useParams().id)
  const code = useLocation().hash.replace(/^#/, '').trim()
  const navigate = useNavigate()
  const { address, connect, connecting, error: walletError } = useWallet()
  const { state, run, busy } = useTx()
  const { data: group, error, loading } = useAsync(() => getGroup(id), [id])

  if (!code) return <ErrorBox message="Este enlace no tiene código de invitación. Pide a tu amigo que te lo vuelva a enviar." />
  if (loading && !group) return <Loading />
  if (error || !group) return <ErrorBox message={error ?? 'No encontramos este grupo.'} />

  const alreadyMember = !!address && group.members.includes(address)

  async function join() {
    const res = await run((opts) => joinGroup(id, code, opts))
    if (res) setTimeout(() => navigate(`/g/${id}`, { replace: true }), 1200)
  }

  return (
    <div className="space-y-5 pt-6 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-ink-500">Te han invitado a</div>
      <h1 className="text-3xl font-bold">{group.name}</h1>
      <div className="flex justify-center -space-x-2">
        {group.members.slice(0, 6).map((m) => (
          <span key={m} className="rounded-full ring-2 ring-ink-50">
            <Avatar address={m} />
          </span>
        ))}
      </div>
      <p className="text-sm text-ink-500">
        {group.members.length} {group.members.length === 1 ? 'persona' : 'personas'} ya dividen gastos aquí. Al unirte
        empiezas con saldo 0.
      </p>

      <Card className="space-y-3 text-left">
        {!address ? (
          <>
            <Button className="w-full py-3" onClick={connect} loading={connecting}>
              Conectar Freighter
            </Button>
            {walletError && <ErrorBox message={walletError} />}
          </>
        ) : alreadyMember && state.status !== 'done' ? (
          <>
            <div className="text-center text-sm text-ink-700">Ya eres miembro de este grupo.</div>
            <Link to={`/g/${id}`}>
              <Button className="w-full">Ir al grupo</Button>
            </Link>
          </>
        ) : (
          <Button className="w-full py-3" onClick={join} loading={busy} disabled={state.status === 'done'}>
            Unirme al grupo
          </Button>
        )}
        <TxStatus state={state} successText="¡Ya estás dentro!" />
      </Card>
    </div>
  )
}
