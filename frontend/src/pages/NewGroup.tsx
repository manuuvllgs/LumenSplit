import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGroup } from '../lib/lumensplit'
import { publishMyNameIfNeeded, setHint, setPendingNames, useNames } from '../lib/aliases'
import { isValidAddress } from '../lib/format'
import { useWallet } from '../wallet'
import { useTx } from '../useTx'
import { Button, Card, Icon, KeyHint, PageHeader, TxStatus } from '../components/ui'
import { t } from '../i18n'

interface Row {
  name: string
  address: string
}

const emptyRow = (): Row => ({ name: '', address: '' })

/**
 * Create a group by choosing WHO takes part, by name. Address is optional:
 * names without one stay pending and travel in the invite link, so each
 * friend picks theirs when joining.
 */
export default function NewGroup() {
  const { address: me } = useWallet()
  const names = useNames([me])
  const navigate = useNavigate()
  const { state, run, busy } = useTx()
  const [groupName, setGroupName] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()])
  const [sharing, setSharing] = useState(false)

  const people = rows.filter((r) => r.name.trim() || r.address.trim())
  const missingName = people.some((r) => !r.name.trim())
  const badAddress = people.find((r) => r.address.trim() && !isValidAddress(r.address))
  const addrs = people.map((r) => r.address.trim()).filter(Boolean)
  const dupAddress = new Set([me, ...addrs]).size !== addrs.length + 1
  const lowerNames = people.map((r) => r.name.trim().toLowerCase())
  const dupName = new Set(lowerNames).size !== lowerNames.length
  const canSubmit = !!groupName.trim() && people.length > 0 && !missingName && !badAddress && !dupAddress && !dupName && !busy

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!me || !canSubmit) return
    const res = await run((opts) => createGroup(me, groupName.trim(), [me, ...addrs], opts))
    if (!res) return
    // Known addresses get the creator's name as a hint until they choose their own.
    people.filter((r) => r.address.trim()).forEach((r) => setHint(r.address.trim(), r.name))
    const pending = people.filter((r) => !r.address.trim()).map((r) => r.name.trim())
    setPendingNames(res.groupId, pending)
    // So friends see who created it. Optional: if cancelled, the group still exists.
    setSharing(true)
    await publishMyNameIfNeeded(me).catch(() => null)
    setSharing(false)
    setTimeout(() => navigate(`/g/${res.groupId}${pending.length ? '?invitar=1' : ''}`), 800)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <PageHeader title={t('Nuevo grupo')} back="/" />
      <Card className="space-y-6">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">{t('Nombre del grupo')}</span>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t('Viaje a Lisboa')}
            maxLength={40}
            className="field mt-1"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-ink-700">{t('¿Quiénes participáis?')}</span>
          <div className="mt-1 flex items-center justify-between gap-3 bg-ink-100 px-3.5 py-3 text-sm">
            <span className="flex flex-col leading-tight">
              <b className="text-ink-900">{(me && names[me]) || t('Tú')}</b>
              {me && <KeyHint address={me} />}
            </span>
            <span className="shrink-0 bg-accent-400 px-1.5 py-px font-control text-[11px] font-semibold text-on-accent">{t('creador')}</span>
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((r, i) => {
              const bad = r.address.trim() && !isValidAddress(r.address)
              return (
                <div key={i} className="border border-ink-300 focus-within:border-ink-900">
                  <div className="flex items-center gap-2 px-3.5 pt-2">
                    <input
                      value={r.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder={['Ana', 'Ben', 'Carla', 'Dani'][i % 4]}
                      maxLength={24}
                      aria-label={t('Nombre del participante')}
                      className="min-h-10 min-w-0 flex-1 bg-transparent font-semibold text-ink-900 placeholder:text-ink-400 focus:outline-none"
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        className="-mr-2 inline-flex h-10 w-10 items-center justify-center text-ink-500 hover:text-neg-600"
                        aria-label={t('Quitar')}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                  </div>
                  <input
                    value={r.address}
                    onChange={(e) => update(i, { address: e.target.value.trim() })}
                    placeholder={t('Dirección G… (opcional, si no, se une con el enlace)')}
                    spellCheck={false}
                    aria-label={t('Dirección Stellar (opcional)')}
                    className={`min-h-9 w-full bg-transparent px-3.5 pb-2 key text-[11px] placeholder:text-ink-400 focus:outline-none ${
                      bad ? 'text-neg-600' : 'text-ink-500'
                    }`}
                  />
                </div>
              )
            })}
          </div>
          <Button type="button" variant="ghost" className="mt-2" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
            {t('+ Añadir participante')}
          </Button>
          {missingName && <p className="mt-1 text-xs text-neg-600">{t('Ponle nombre a cada participante.')}</p>}
          {dupName && <p className="mt-1 text-xs text-neg-600">{t('Hay nombres repetidos.')}</p>}
          {badAddress && <p className="mt-1 text-xs text-neg-600">{t('Alguna dirección no es una cuenta Stellar válida (G…).')}</p>}
          {dupAddress && <p className="mt-1 text-xs text-neg-600">{t('Hay direcciones repetidas (o has puesto la tuya).')}</p>}
          <p className="mt-2 text-xs text-ink-500">
            {t('Al crear el grupo te daremos un enlace y un QR. Cada amigo lo abre, elige su nombre de esta lista y entra.')}
          </p>
        </div>
      </Card>

      <div className="mt-5 space-y-3">
        <TxStatus state={state} successText={t('Grupo creado')} />
        {sharing && (
          <div role="status" className="border-l-4 border-brand-600 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
            {t('Compartiendo tu nombre con el grupo (firma en Freighter, opcional)…')}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={!canSubmit} loading={busy}>
          {t('Crear grupo')}
        </Button>
      </div>
    </form>
  )
}
