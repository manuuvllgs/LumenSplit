import { Link } from 'react-router-dom'
import { listMyGroups } from '../lib/lumensplit'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Avatar, Button, Card, ErrorBox, Icon, Loading } from '../components/ui'
import { t } from '../i18n'

export default function Home() {
  const { address, connect, connecting, activating, error } = useWallet()

  if (!address) {
    return (
      <section className="grid items-center gap-10 py-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-14 md:py-12">
        <div className="max-w-xl">
          {/* Enough line-height + a highlight that sits inside the line box, so the gold
              band never covers the descenders (p, g, y) of the line above. */}
          <h1 className="text-4xl leading-[1.2] text-ink-900 sm:text-5xl lg:text-6xl">
            {t('Divide gastos con amigos.')}{' '}
            <span
              className="box-decoration-clone px-1.5 text-on-accent"
              style={{
                backgroundImage: 'linear-gradient(transparent 12%, var(--gold) 12%, var(--gold) 96%, transparent 96%)',
              }}
            >
              {t('Salda cuentas en segundos.')}
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-ink-700 sm:text-lg">
            {t('Una forma nueva de compartir gastos, construida sobre la blockchain de Stellar: pagos que llegan en segundos a cualquier país, comisiones de menos de un céntimo y un registro compartido que nadie puede alterar.')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="w-full sm:w-auto sm:px-8" onClick={connect} loading={connecting}>
              {activating ? t('Activando tu cuenta de pruebas…') : t('Conectar Freighter')}
            </Button>
            <p className="text-sm text-ink-500">
              {t('¿No tienes Freighter?')}{' '}
              <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="font-medium text-ink-900 underline underline-offset-2">
                {t('Instálalo aquí')}
              </a>{' '}
              {t('y cambia a Testnet.')}
            </p>
          </div>
          {error && (
            <div className="mt-4">
              <ErrorBox message={error} />
            </div>
          )}
        </div>

        {/* The product's own path, drawn as a ledger: no invented figures. */}
        <ol
          className="rounded-2xl bg-shade p-5 text-on-shade sm:p-7"
          aria-label="LumenSplit"
          style={{ ['--logo-ink' as string]: 'var(--on-shade)' }}
        >
          {[t('+ Nuevo grupo'), t('+ Añadir gasto'), t('Saldar cuentas')].map((step, i) => (
            <li key={step} className="flex items-center gap-4 border-b border-shade-rule py-4 last:border-b-0">
              <span className="key flex h-9 w-9 shrink-0 items-center justify-center border border-shade-rule text-sm text-on-shade-muted">
                0{i + 1}
              </span>
              <span className={`font-display text-xl ${i === 2 ? 'text-accent-400' : ''}`}>{step.replace(/^\+\s*/, '')}</span>
            </li>
          ))}
          <li className="key pt-4 text-xs text-on-shade-muted">Stellar testnet</li>
        </ol>
      </section>
    )
  }

  return <GroupList address={address} />
}

function GroupList({ address }: { address: string }) {
  const { data: groups, error, loading } = useAsync(() => listMyGroups(address), [address])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl text-ink-900 sm:text-4xl">{t('Mis grupos')}</h1>
        <Link to="/new" className="btn btn-ink">
          <Icon name="plus" />
          {t('+ Nuevo grupo').replace(/^\+\s*/, '')}
        </Link>
      </div>
      {loading && !groups && <Loading />}
      {error && <ErrorBox message={error} />}
      {groups && groups.length === 0 && (
        <Card className="py-12 text-center">
          <p className="font-display text-xl text-ink-900">{t('Aún no tienes grupos.')}</p>
          <p className="mt-1 text-ink-500">{t('Crea uno para empezar a dividir gastos.')}</p>
          <Link to="/new" className="btn btn-frame mt-6">
            {t('+ Nuevo grupo').replace(/^\+\s*/, '')}
          </Link>
        </Card>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {groups?.map((g) => (
          <li key={g.id} className="min-w-0">
            <Link
              to={`/g/${g.id}`}
              className="group flex h-full flex-col justify-between gap-6 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink-200 hover:ring-ink-900"
            >
              <div className="min-w-0">
                <h2 className="truncate text-xl text-ink-900">{g.name}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {t('{n} miembros · grupo #{id}', { n: g.members.length, id: g.id })}
                </p>
              </div>
              <div className="flex -space-x-2">
                {g.members.slice(0, 5).map((m) => (
                  <span key={m} className="rounded-full ring-2 ring-surface">
                    <Avatar address={m} />
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
