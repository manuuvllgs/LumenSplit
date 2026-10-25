import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { getGroup, joinGroup } from '../lib/lumensplit'
import { publishedName, publishMyNameIfNeeded, setMyName, useMyName, useNames } from '../lib/aliases'
import { parseInviteHash } from '../lib/inviteLink'
import { humanizeError } from '../lib/errors'
import { explorerTxUrl } from '../lib/format'
import { ensureFunded, MAX_NAME_LENGTH, validateName } from '../lib/profile'
import { useWallet } from '../wallet'
import { useAsync } from '../useAsync'
import { Avatar, Button, Card, ErrorBox, KeyHint, Loading, Spinner } from '../components/ui'
import { t } from '../i18n'

type Step =
  | { s: 'idle' }
  | { s: 'name' }
  | { s: 'join'; nameHash?: string }
  | { s: 'done'; joinHash: string; nameShared: boolean }
  | { s: 'error'; message: string }

/**
 * /join/:id#<code>&n=Ana,Ben — opened from an invite link or QR. Works before
 * connecting a wallet. The friend picks their name from the list sent by the
 * group, then joins: 1/2 save name on their account (if it changed), 2/2 join.
 */
export default function Join() {
  const id = Number(useParams().id)
  const { code, names: offered } = parseInviteHash(useLocation().hash)
  const navigate = useNavigate()
  const { address, connect, connecting, error: walletError } = useWallet()
  const myName = useMyName(address)
  const { data: group, error, loading } = useAsync(() => getGroup(id), [id])
  const memberNames = useNames(group?.members ?? [])
  const [picked, setPicked] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [step, setStep] = useState<Step>({ s: 'idle' })

  // Preselect the name this account already uses.
  useEffect(() => {
    if (picked === null && myName) setPicked(myName)
  }, [myName, picked])

  if (!code) return <ErrorBox message={t('Este enlace no tiene código de invitación. Pide a tu amigo que te lo vuelva a enviar.')} />
  if (loading && !group) return <Loading />
  if (error || !group) return <ErrorBox message={error ?? t('No encontramos este grupo.')} />

  const alreadyMember = !!address && group.members.includes(address)
  const taken = new Set(group.members.map((m) => memberNames[m]?.toLowerCase()).filter(Boolean))
  const choices = offered.filter((n) => !taken.has(n.toLowerCase()))
  if (myName && !choices.some((n) => n.toLowerCase() === myName.toLowerCase())) choices.unshift(myName)
  const finalName = (picked === '__other__' ? other : picked ?? '').trim()
  const nameError = finalName ? validateName(finalName) : null
  const busy = step.s === 'name' || step.s === 'join'
  const needsPublish = !!address && !!finalName && publishedName(address) !== finalName
  const twoSteps = needsPublish
  const canJoin = !!address && !!finalName && !nameError && !busy && step.s !== 'done'

  async function join() {
    if (!address || !canJoin) return
    let nameShared = true
    try {
      setMyName(address, finalName)
      await ensureFunded(address)
      if (needsPublish) {
        setStep({ s: 'name' })
        // Sharing the name is nice-to-have: if it is cancelled, still join.
        nameShared = await publishMyNameIfNeeded(address).then(
          () => true,
          () => false,
        )
      }
      setStep({ s: 'join' })
      const res = await joinGroup(id, code)
      setStep({ s: 'done', joinHash: res.hash, nameShared })
      setTimeout(() => navigate(`/g/${id}`, { replace: true }), 1500)
    } catch (e) {
      setStep({ s: 'error', message: humanizeError(e) })
    }
  }


  return (
    <div className="space-y-5 pt-6 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-ink-500">{t('Te han invitado a')}</div>
      <h1 className="text-3xl font-bold">{group.name}</h1>
      <div className="flex justify-center -space-x-2">
        {group.members.slice(0, 6).map((m) => (
          <span key={m} className="rounded-full ring-2 ring-ink-50">
            <Avatar address={m} />
          </span>
        ))}
      </div>
      <p className="text-sm text-ink-500">
        {group.members.length === 1
          ? t('1 persona ya divide gastos aquí.')
          : t('{n} personas ya dividen gastos aquí.', { n: group.members.length })}{' '}
        {t('Al unirte empiezas con saldo 0.')}
      </p>

      <Card className="space-y-4 text-left">
        {!address ? (
          <>
            <Button className="w-full py-3" onClick={connect} loading={connecting}>
              {t('Conectar Freighter')}
            </Button>
            {walletError && <ErrorBox message={walletError} />}
          </>
        ) : alreadyMember && step.s !== 'done' ? (
          <>
            <div className="text-center text-sm text-ink-700">{t('Ya eres miembro de este grupo.')}</div>
            <Link to={`/g/${id}`}>
              <Button className="w-full">{t('Ir al grupo')}</Button>
            </Link>
          </>
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold text-ink-900">{t('¿Quién eres?')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {choices.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => setPicked(n)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                      picked === n ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-900 ring-ink-200 hover:ring-brand-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPicked('__other__')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                    picked === '__other__' ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-500 ring-ink-200'
                  }`}
                >
                  {choices.length ? t('Otro nombre') : t('Escribir mi nombre')}
                </button>
              </div>
              {picked === '__other__' && (
                <input
                  autoFocus
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={t('Tu nombre')}
                  className="mt-2 w-full rounded-xl border border-ink-200 px-3 py-2.5 font-semibold focus:border-brand-600 focus:outline-none"
                />
              )}
              {nameError && <p className="mt-1 text-xs text-neg-600">{nameError}</p>}
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>{t('Tu cuenta')}</span>
                <KeyHint address={address} />
              </div>
            </div>
            <Button className="w-full py-3" onClick={join} loading={busy} disabled={!canJoin}>
              {finalName ? t('Unirme como {name}', { name: finalName }) : t('Elige tu nombre')}
            </Button>
            {canJoin && (
              <p className="text-center text-xs text-ink-500">
                {twoSteps
                  ? t('2 firmas en Freighter: compartir tu nombre con el grupo y unirte.')
                  : t('1 firma en Freighter para unirte.')}
              </p>
            )}
          </>
        )}
        <JoinProgress step={step} twoSteps={twoSteps} />
      </Card>
    </div>
  )
}

function JoinProgress({ step, twoSteps }: { step: Step; twoSteps: boolean }) {
  if (step.s === 'idle') return null
  if (step.s === 'error') return <div className="rounded-xl bg-neg-50 p-3 text-sm text-neg-700">⚠ {step.message}</div>
  if (step.s === 'done')
    return (
      <div className="rounded-xl bg-pos-50 p-3 text-sm text-pos-700">
        ✓ {t('¡Ya estás dentro!')}{step.nameShared ? '' : t(' (tu nombre solo se ve en este dispositivo)')}{' '}
        <a href={explorerTxUrl(step.joinHash)} target="_blank" rel="noreferrer" className="font-semibold underline">
          {t('Ver en stellar.expert ↗')}
        </a>
      </div>
    )
  return (
    <div className="space-y-1 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
      {twoSteps && (
        <div className="flex items-center gap-2">
          {step.s === 'name' ? <Spinner /> : <span>✓</span>} {t('1/2 Compartiendo tu nombre…')}
        </div>
      )}
      {step.s === 'join' && (
        <div className="flex items-center gap-2">
          <Spinner /> {twoSteps ? '2/2 ' : ''}{t('Uniéndote al grupo…')}
        </div>
      )}
    </div>
  )
}
