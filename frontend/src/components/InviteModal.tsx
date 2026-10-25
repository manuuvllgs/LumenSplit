import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createInvite, type Invite } from '../lib/lumensplit'
import { useTx } from '../useTx'
import { Button, TxStatus } from './ui'

/** "Invitar amigos": creates an invite (one signature) and shows link + QR. */
export function InviteModal({ groupId, groupName, onClose }: { groupId: number; groupName: string; onClose: () => void }) {
  const { state, run, busy } = useTx()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function generate() {
    setCopied(false)
    let created: Invite | null = null
    const res = await run(async (opts) => {
      created = await createInvite(groupId, opts)
      return { hash: '' }
    })
    if (res && created) setInvite(created)
  }

  async function copy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.link)
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
        aria-label="Invitar amigos"
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Invitar amigos</h2>
            <p className="text-sm text-ink-500">
              Quien abra el enlace entra en <b>{groupName}</b> con su Freighter. Sin copiar direcciones.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {invite ? (
          <>
            <div className="flex justify-center rounded-xl bg-ink-50 p-4">
              <QRCodeSVG value={invite.link} size={196} fgColor="#15132e" bgColor="transparent" marginSize={0} />
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={invite.link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs"
              />
              <Button onClick={copy}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
            </div>
            {canShare && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigator.share({ title: `Únete a ${groupName} en LumenSplit`, url: invite.link }).catch(() => {})}
              >
                Compartir…
              </Button>
            )}
            <p className="text-xs text-ink-500">
              El enlace vale para todo el grupo. Si generas uno nuevo, el anterior deja de funcionar.{' '}
              <button onClick={generate} disabled={busy} className="font-semibold text-brand-700 underline">
                Generar otro
              </button>
            </p>
          </>
        ) : (
          <Button className="w-full py-3" onClick={generate} loading={busy}>
            Crear enlace de invitación
          </Button>
        )}
        {state.status !== 'done' && <TxStatus state={state} />}
      </div>
    </div>
  )
}
