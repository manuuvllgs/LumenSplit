import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGroup } from '../lib/lumensplit'
import { setAlias } from '../lib/aliases'
import { isValidAddress, shortAddress } from '../lib/format'
import { useWallet } from '../wallet'
import { useTx } from '../useTx'
import { Button, Card, PageHeader, TxStatus } from '../components/ui'

interface Row {
  address: string
  alias: string
}

export default function NewGroup() {
  const { address: me } = useWallet()
  const navigate = useNavigate()
  const { state, run, busy } = useTx()
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([{ address: '', alias: '' }])

  const filled = rows.filter((r) => r.address.trim())
  const invalid = filled.find((r) => !isValidAddress(r.address))
  const addrs = filled.map((r) => r.address.trim())
  const dup = new Set([me, ...addrs]).size !== addrs.length + 1
  const canSubmit = name.trim() && filled.length > 0 && !invalid && !dup && !busy

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!me || !canSubmit) return
    filled.forEach((r) => r.alias.trim() && setAlias(r.address.trim(), r.alias))
    const res = await run((opts) => createGroup(me, name.trim(), [me, ...addrs], opts))
    if (res) setTimeout(() => navigate(`/g/${res.groupId}`), 1200)
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="Nuevo grupo" back="/" />
      <Card className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Nombre del grupo</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Viaje a Lisboa"
            maxLength={40}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 focus:border-brand-600 focus:outline-none"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-ink-700">Miembros</span>
          <div className="mt-1 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-500">
            Tú ({me && shortAddress(me)}) se añade automáticamente
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((r, i) => {
              const bad = r.address.trim() && !isValidAddress(r.address)
              return (
                <div key={i} className="flex gap-2">
                  <input
                    value={r.alias}
                    onChange={(e) => update(i, { alias: e.target.value })}
                    placeholder="Alias"
                    className="w-24 rounded-xl border border-ink-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={r.address}
                    onChange={(e) => update(i, { address: e.target.value.trim() })}
                    placeholder="G…"
                    spellCheck={false}
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 font-mono text-xs ${bad ? 'border-neg-600' : 'border-ink-200'}`}
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                      className="px-1 text-ink-400 hover:text-neg-600"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <Button type="button" variant="ghost" className="mt-2" onClick={() => setRows((rs) => [...rs, { address: '', alias: '' }])}>
            + Añadir miembro
          </Button>
          {invalid && <p className="mt-1 text-xs text-neg-600">Alguna dirección no es una cuenta Stellar válida (G…).</p>}
          {dup && <p className="mt-1 text-xs text-neg-600">Hay direcciones repetidas (o has puesto la tuya).</p>}
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        <TxStatus state={state} successText="Grupo creado" />
        <Button type="submit" className="w-full py-3" disabled={!canSubmit} loading={busy}>
          Crear grupo
        </Button>
      </div>
    </form>
  )
}
