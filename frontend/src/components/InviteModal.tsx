import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createInvite, type Invite } from '../lib/lumensplit'
import { getPendingNames, setPendingNames } from '../lib/aliases'
import { withPendingNames } from '../lib/inviteLink'
import { useTx } from '../useTx'
import { Button, TxStatus } from './ui'
import { t } from '../i18n'

/**
 * "Invitar amigos": creates an invite (one signature) and shows link + QR.
 * The link also carries the names still waiting for someone, so whoever opens
 * it just taps theirs.
 */
export function InviteModal({
  groupId,
  groupName,
  takenNames,
  onClose,
}: {
  groupId: number
  groupName: string
  /** Names members already chose; they are dropped from the pending list. */
  takenNames: string[]
  onClose: () => void
}) {
  const { state, run, busy } = useTx()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [copied, setCopied] = useState(false)
  const taken = new Set(takenNames.map((n) => n.toLowerCase()))
  const [pending, setPending] = useState<string[]>(() =>
    getPendingNames(groupId).filter((n) => !taken.has(n.toLowerCase())),
  )
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  function updatePending(next: string[]) {
    setPending(next)
    setPendingNames(groupId, next)
    setCopied(false)
  }

  function addName(e: React.FormEvent) {
    e.preventDefault()
    const v = newName.trim()
    if (!v || pending.some((p) => p.toLowerCase() === v.toLowerCase()) || taken.has(v.toLowerCase())) return
    updatePending([...pending, v])
    setNewName('')
  }

  async function generate() {
    setCopied(false)
    let created: Invite | null = null
    const res = await run(async (opts) => {
      created = await createInvite(groupId, opts)
      return { hash: '' }
    })
    if (res && created) setInvite(created)
  }

  const link = invite ? withPendingNames(invite.link, pending) : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      /* clipboard blocked: the input below is selectable */
    }
  }

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-4 sm:items-center"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Invitar amigos')}
        className="max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{t('Invitar amigos')}</h2>
            <p className="text-sm text-ink-500">
              {t('Quien abra el enlace elige su nombre y entra en {group} con su Freighter.', { group: groupName })}
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100" aria-label={t('Cerrar')}>
            ✕
          </button>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{t('Faltan por unirse')}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {pending.length === 0 && <span className="text-sm text-ink-400">{t('Nadie. Añade nombres o comparte el enlace tal cual.')}</span>}
            {pending.map((n) => (
              <span key={n} className="flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1.5 pl-3 text-sm font-semibold text-brand-800">
                {n}
                <button
                  type="button"
                  onClick={() => updatePending(pending.filter((p) => p !== n))}
                  className="rounded-full px-1 text-brand-600 hover:bg-brand-100"
                  aria-label={t('Quitar {name}', { name: n })}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={addName} className="mt-2 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={24}
              placeholder={t('Añadir nombre')}
              className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-1.5 text-sm"
            />
            <Button type="submit" variant="secondary" className="py-1.5!" disabled={!newName.trim()}>
              {t('Añadir')}
            </Button>
          </form>
        </div>

        {invite ? (
          <>
            <div className="flex justify-center rounded-xl bg-ink-50 p-4">
              <QRCodeSVG value={link} size={196} fgColor="#15132e" bgColor="transparent" marginSize={0} />
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs"
              />
              <Button onClick={copy}>{copied ? t('¡Copiado!') : t('Copiar')}</Button>
            </div>
            {canShare && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigator.share({ title: t('Únete a {group} en LumenSplit', { group: groupName }), url: link }).catch(() => {})}
              >
                {t('Compartir…')}
              </Button>
            )}
            <p className="text-xs text-ink-500">
              {t('El enlace vale para todo el grupo. Si generas uno nuevo, el anterior deja de funcionar.')}{' '}
              <button onClick={generate} disabled={busy} className="font-semibold text-brand-700 underline">
                {t('Generar otro')}
              </button>
            </p>
          </>
        ) : (
          <Button className="w-full py-3" onClick={generate} loading={busy}>
            {t('Crear enlace de invitación')}
          </Button>
        )}
        {state.status !== 'done' && <TxStatus state={state} />}
      </div>
    </div>
  )
}
