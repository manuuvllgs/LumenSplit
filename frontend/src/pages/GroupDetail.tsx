import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getBalances, getExpenses, getGroup, type Expense } from '../lib/lumensplit'
import { formatAmount, formatDate } from '../lib/format'
import { useDisplayName, useNames } from '../lib/aliases'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Amount, Avatar, Button, Card, ErrorBox, KeyHint, Loading, MemberName, PageHeader } from '../components/ui'
import { InviteModal } from '../components/InviteModal'
import { t } from '../i18n'

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
  const [search, setSearch] = useSearchParams()
  const [inviting, setInviting] = useState(search.get('invitar') === '1')
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([getGroup(id), getBalances(id), getExpenses(id)]),
    [id],
  )
  const names = useNames(data ? data[0].members : [])

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? t('No se pudo cargar el grupo')} />
  const [group, balances, expenses] = data
  const memberNames = group.members.map((m) => names[m]).filter((n): n is string => !!n)
  const mine = me ? (balances[me] ?? 0n) : 0n
  const total = expenses.reduce((s, e) => s + e.amount, 0n)
  const unsettled = Object.values(balances).some((b) => b !== 0n)

  return (
    <div>
      <PageHeader
        title={group.name}
        back="/"
        right={
          <Button variant="secondary" onClick={() => setInviting(true)} className="hidden sm:inline-flex">
            {t('Invitar amigos')}
          </Button>
        }
      />
      {inviting && (
        <InviteModal
          groupId={id}
          groupName={group.name}
          takenNames={memberNames}
          onClose={() => {
            setInviting(false)
            if (search.has('invitar')) setSearch({}, { replace: true })
            void reload()
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
          {/* The balance: Dusk slate, the figure set big */}
          <section className="rounded-2xl bg-shade p-5 text-on-shade sm:p-6" aria-label={t('Tu saldo')}>
            <p className="text-sm text-on-shade-muted">{t('Tu saldo')}</p>
            <p className="mt-1 font-display text-4xl font-semibold sm:text-5xl">
              {mine === 0n ? (
                t('Estás en paz')
              ) : (
                <Amount value={mine} signed className={mine > 0n ? 'text-pos-on-shade!' : 'text-neg-on-shade!'} />
              )}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-shade-rule pt-4 text-sm">
              <div>
                <dt className="text-on-shade-muted">{mine > 0n ? t('Te deben dinero') : mine < 0n ? t('Debes dinero') : t('No debes nada')}</dt>
              </div>
              <div className="text-right">
                <dt className="text-on-shade-muted">{t('Gasto total')}</dt>
                <dd className="mt-0.5">
                  <Amount value={total} className="text-on-shade!" />
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <Link to={`/g/${id}/expense`} className="btn btn-ink">
              {t('+ Añadir gasto').replace(/^\+\s*/, '')}
            </Link>
            {unsettled ? (
              <Link to={`/g/${id}/settle`} className="btn btn-gold">
                {t('Saldar cuentas')}
              </Link>
            ) : (
              <Button variant="secondary" disabled>
                {t('Todo saldado')}
              </Button>
            )}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg text-ink-900">{t('Saldos')}</h2>
              <Button variant="ghost" onClick={() => setInviting(true)} className="sm:hidden">
                {t('Invitar amigos')}
              </Button>
            </div>
            <Card className="divide-y divide-ink-200 p-0! sm:p-0!">
              {group.members.map((m) => (
                <div key={m} className="flex items-center gap-3 px-4 py-3">
                  <Avatar address={m} />
                  <div className="min-w-0 flex-1">
                    <MemberName address={m} me={me} editable />
                  </div>
                  <Amount value={balances[m] ?? 0n} signed className="shrink-0" />
                </div>
              ))}
              {group.members.length === 1 && (
                <button
                  onClick={() => setInviting(true)}
                  className="w-full px-4 py-4 text-left text-sm font-semibold text-brand-700 underline underline-offset-2 hover:bg-brand-50"
                >
                  {t('Estás solo en el grupo. Invita a tus amigos con un enlace o QR →')}
                </button>
              )}
            </Card>
          </section>
        </div>

        <section className="lg:col-span-7">
          <h2 className="mb-3 text-lg text-ink-900">{t('Gastos')}</h2>
          {expenses.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-ink-500">{t('Todavía no hay gastos.')}</p>
              <Link to={`/g/${id}/expense`} className="btn btn-frame mt-5">
                {t('+ Añadir gasto').replace(/^\+\s*/, '')}
              </Link>
            </Card>
          ) : (
            <Card className="divide-y divide-ink-200 p-0! sm:p-0!">
              {[...expenses].reverse().map((e, i) => (
                <article key={i} className="flex gap-3 px-4 py-4 sm:px-5">
                  <Avatar address={e.payer} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 truncate font-sans text-base font-semibold tracking-normal text-ink-900">{e.description}</h3>
                      <Amount value={e.amount} className="shrink-0" />
                    </div>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-500">
                      <span>
                        {t('Pagó')} <b className="font-semibold text-ink-900">{e.payer === me ? t('tú') : name(e.payer)}</b>
                      </span>
                      <span>
                        {e.participants.length} {t('personas')}
                      </span>
                      <span>{formatDate(e.timestamp)}</span>
                    </p>
                    <KeyHint address={e.payer} />
                    {isCustomSplit(e) && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {e.participants.map((p, j) => (
                          <li key={p} title={p} className="flex flex-col bg-ink-100 px-2 py-1 text-[11px] text-ink-700">
                            <span>
                              <b className="font-semibold text-ink-900">{p === me ? t('Tú') : name(p)}</b>{' '}
                              <span className="figure">{formatAmount(e.shares![j], false, 2)}</span>
                            </span>
                            <KeyHint address={p} className="text-[10px]" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
