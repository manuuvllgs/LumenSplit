/**
 * Each person's display name lives on their OWN Stellar account, as an
 * account data entry (`manageData`, key "lumensplit.name"). Only the owner can
 * set it (one Freighter signature), anyone can read it from Horizon for free,
 * and it needs no contract change. Values are at most 64 bytes.
 */
import { BASE_FEE, Horizon, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'
import { LumenSplitError } from './errors'
import type { Address, TxOptions, TxResult } from './lumensplit'

export const NAME_KEY = 'lumensplit.name'
export const MAX_NAME_LENGTH = 24

const HORIZON_URL: string = import.meta.env.VITE_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'
const PASSPHRASE = import.meta.env.VITE_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
// Same rule as lumensplit.ts (kept local to avoid an import cycle with mock.ts).
const IS_MOCK = !import.meta.env.VITE_CONTRACT_ID || import.meta.env.VITE_USE_MOCK === 'true'
const MOCK_KEY = 'lumensplit.mock.names'

function mockNames(): Record<Address, string> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) || '{}') as Record<Address, string>
  } catch {
    return {}
  }
}

/** Demo data only: pretend these accounts already chose their names. */
export function seedMockNames(names: Record<Address, string>) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify({ ...mockNames(), ...names }))
  } catch {
    /* ignore */
  }
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** The name `address` chose for itself, or null if none (or the account doesn't exist yet). */
export async function fetchName(address: Address): Promise<string | null> {
  if (IS_MOCK) return mockNames()[address] ?? null
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Horizon ${res.status}`)
  const account = (await res.json()) as { data?: Record<string, string> }
  const raw = account.data?.[NAME_KEY]
  return raw ? decodeBase64Utf8(raw) : null
}

export function validateName(name: string): string | null {
  const v = name.trim()
  if (!v) return 'Escribe un nombre.'
  if (v.length > MAX_NAME_LENGTH) return `Máximo ${MAX_NAME_LENGTH} caracteres.`
  if (new TextEncoder().encode(v).length > 64) return 'Nombre demasiado largo.'
  return null
}

/** Saves the connected account's own name on its Stellar account (one signature). */
export async function saveMyName(address: Address, name: string, opts?: TxOptions): Promise<TxResult> {
  const err = validateName(name)
  if (err) throw new LumenSplitError(err)
  const value = name.trim()

  if (IS_MOCK) {
    opts?.onPhase?.('signing')
    await new Promise((r) => setTimeout(r, 600))
    opts?.onPhase?.('submitting')
    await new Promise((r) => setTimeout(r, 800))
    seedMockNames({ [address]: value })
    return { hash: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('') }
  }

  const horizon = new Horizon.Server(HORIZON_URL)
  let account
  try {
    account = await horizon.loadAccount(address)
  } catch {
    throw new LumenSplitError('Tu cuenta aún no existe en testnet. Fóndeala gratis con Friendbot y vuelve a intentarlo.')
  }
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(Operation.manageData({ name: NAME_KEY, value }))
    .setTimeout(120)
    .build()

  opts?.onPhase?.('signing')
  const signed = await signTransaction(tx.toXDR(), { networkPassphrase: PASSPHRASE, address })
  if (signed.error) throw new LumenSplitError(signed.error.message || 'Has cancelado la firma en Freighter.')
  opts?.onPhase?.('submitting')
  const res = await horizon.submitTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, PASSPHRASE))
  return { hash: res.hash }
}
