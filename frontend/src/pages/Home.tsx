import { Link } from 'react-router-dom'
import { listMyGroups } from '../lib/lumensplit'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Avatar, Button, Card, ErrorBox, Loading } from '../components/ui'

export default function Home() {
  const { address, connect, connecting, activating, error } = useWallet()

  if (!address) {
    return (
      <div className="pt-10 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-ink-900">
          Divide gastos con amigos.
          <br />
          <span className="text-brand-600">Salda cuentas en segundos.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-ink-500">
          Como Tricount, pero cuando toca pagar el dinero llega al momento, desde cualquier país y por menos de un céntimo.
        </p>
        <Button className="mt-8 w-full py-3 text-base" onClick={connect} loading={connecting}>
          {activating ? 'Activando tu cuenta de pruebas…' : 'Conectar Freighter'}
        </Button>
        {error && (
          <div className="mt-4">
            <ErrorBox message={error} />
          </div>
        )}
        <p className="mt-4 text-xs text-ink-400">
          ¿No tienes Freighter?{' '}
          <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="underline">
            Instálalo aquí
          </a>{' '}
          y cambia a Testnet.
        </p>
      </div>
    )
  }

  return <GroupList address={address} />
}

function GroupList({ address }: { address: string }) {
  const { data: groups, error, loading } = useAsync(() => listMyGroups(address), [address])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis grupos</h1>
        <Link to="/new">
          <Button>+ Nuevo grupo</Button>
        </Link>
      </div>
      {loading && !groups && <Loading />}
      {error && <ErrorBox message={error} />}
      {groups && groups.length === 0 && (
        <Card className="py-10 text-center text-ink-500">
          Aún no tienes grupos. <br />
          Crea uno para empezar a dividir gastos.
        </Card>
      )}
      <ul className="space-y-3">
        {groups?.map((g) => (
          <li key={g.id}>
            <Link to={`/g/${g.id}`}>
              <Card className="flex items-center gap-3 transition hover:ring-brand-300">
                <div className="flex-1">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-ink-500">
                    {g.members.length} miembros · grupo #{g.id}
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {g.members.slice(0, 4).map((m) => (
                    <span key={m} className="rounded-full ring-2 ring-white">
                      <Avatar address={m} />
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
