/**
 * Names and account activation.
 *
 * - Your alias is saved locally first (instant, no signature) — see aliases.ts.
 * - To let friends see it, it is *published* on your OWN Stellar account as an
 *   account data entry (`manageData`, key "lumensplit.name"): only the owner can
 *   write it (one Freighter signature), it is public and readable by anyone
 *   from Horizon, holds nothing secret, and needs no contract change.
 * - A brand-new Freighter account does not exist on the network until it gets
 *   XLM. On testnet we activate it automatically with Friendbot, so it can
 *   create groups, join and pay.
 */
import { BASE_FEE, Horizon, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'
import { LumenSplitError } from './errors'
import type { Address, TxOptions, TxResult } from './lumensplit'
import { t } from '../i18n'

export const NAME_KEY = 'lumensplit.name'
export const MAX_NAME_LENGTH = 24

const HORIZON_URL: string = import.meta.env.VITE_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'
const PASSPHRASE = import.meta.env.VITE_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
// Same rule as lumensplit.ts (kept local to avoid an import cycle with mock.ts).
const IS_MOCK = !import.meta.env.VITE_CONTRACT_ID || import.meta.env.VITE_USE_MOCK === 'true'
const MOCK_KEY = 'lumensplit.mock.names'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'

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

async function accountExists(address: Address): Promise<boolean> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`)
  if (res.status === 404) return false
  if (!res.ok) throw new Error(`Horizon ${res.status}`)
  return true
}

/**
 * Makes sure the account exists on the network. On testnet, a new account is
 * funded with Friendbot (free test XLM). Returns true if it had to be activated.
 */
export async function ensureFunded(address: Address): Promise<boolean> {
  if (IS_MOCK || (await accountExists(address))) return false
  if (PASSPHRASE !== Networks.TESTNET) {
    throw new LumenSplitError(t('Tu cuenta aún no tiene XLM. Envíale algunos para activarla.'))
  }
  await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`).catch(() => null)
  // Friendbot answers once the ledger closes; poll briefly in case it is slow.
  for (let i = 0; i < 10; i++) {
    if (await accountExists(address)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new LumenSplitError(t('No pudimos activar tu cuenta de pruebas. Inténtalo de nuevo en unos segundos.'))
}

/** The name `address` published on its account, or null if none (or the account doesn't exist yet). */
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
  if (!v) return t('Escribe un nombre.')
  if (v.length > MAX_NAME_LENGTH) return t('Máximo {n} caracteres.', { n: MAX_NAME_LENGTH })
  if (new TextEncoder().encode(v).length > 64) return t('Nombre demasiado largo.')
  return null
}

/** Publishes the connected account's name on its own Stellar account (one signature) so friends see it. */
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

  await ensureFunded(address)
  const horizon = new Horizon.Server(HORIZON_URL)
  const account = await horizon.loadAccount(address)
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
