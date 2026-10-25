/**
 * Passkey smart accounts for LumenSplit, through Nido (https://test.nido.fyi).
 *
 * A Nido account is a smart account (a `C…` address) whose owner signs with a
 * passkey: Face ID, Touch ID or the phone's lock screen. No extension, no seed
 * phrase. Testnet only, like hosted Nido.
 *
 * The passkey cannot authorize calls into our contract directly. Instead the
 * owner approves, once and on Nido's own page, a **session**: a key this app
 * holds may call LumenSplit's functions, and move at most a capped amount of
 * XLM a day, for 7 days. The account enforces those rules on every call, and
 * the app signs the calls itself without further prompts.
 *
 * Library code vendored from nidohq/scaffold-template (Apache-2.0).
 */
import { Asset, Networks, rpc, StrKey } from '@stellar/stellar-sdk'
import { NidoModule } from './wallet/index'
import {
  activeSession,
  checkSession,
  forgetSession,
  onSessionChange,
  requestSession,
  resumeSession,
  sessionStatus,
  submitWithSession,
  describe as describeNido,
  type Grant,
  type SessionStatus,
} from './session'

export const NIDO_BASE: string = import.meta.env.VITE_NIDO_BASE || 'https://test.nido.fyi'
const PASSPHRASE = Networks.TESTNET
const RPC_URL: string = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org'
const CONTRACT_ID: string = import.meta.env.VITE_CONTRACT_ID

export const server = new rpc.Server(RPC_URL)
export const xlmTokenId = Asset.native().contractId(PASSPHRASE)

/** True for a smart-account (`C…`) address, e.g. a Nido passkey account. */
export const isSmartAccount = (address: string | null | undefined): address is string =>
  !!address && StrKey.isValidContract(address)

const nido = new NidoModule({ base: NIDO_BASE, networkPassphrase: PASSPHRASE })

/** Opens Nido to pick or create a passkey account. Resolves with its `C…` address. */
export async function connectNido(): Promise<string> {
  const { address } = await nido.getAddress()
  if (!isSmartAccount(address)) throw new Error('Nido did not return a smart account')
  return address
}

/** Writes LumenSplit makes on behalf of the user. */
const LUMENSPLIT_FUNCTIONS = [
  'create_group',
  'add_expense',
  'add_expense_custom',
  'settle',
  'settle_all',
  'create_invite',
  'join_group',
]

/** Daily cap on XLM the session may move out of the account (settling debts). */
export const DAILY_XLM_CAP = '100'

/**
 * What the owner approves: our contract's functions, and `transfer` on the XLM
 * token (every settlement moves XLM out of the account) under a daily cap.
 */
export function lumensplitGrants(): Grant[] {
  return [
    { target: CONTRACT_ID, functions: LUMENSPLIT_FUNCTIONS, duration: '7d', label: 'lumensplit' },
    {
      target: xlmTokenId,
      functions: ['transfer'],
      duration: '7d',
      limit: { amount: DAILY_XLM_CAP, period: 'day' },
      label: 'lumensplit-xlm',
    },
  ]
}

const friendbotUrl = (address: string) => `https://friendbot.stellar.org/?addr=${address}`

/** Where this account stands with our grants: ready, ask (and what), or waiting. */
export const nidoStatus = (account: string): SessionStatus => sessionStatus(account, lumensplitGrants())

/**
 * Send the owner to Nido to approve the missing grants (one passkey
 * confirmation each). Navigates away; call from a click handler.
 */
export function requestNidoSession(account: string) {
  const status = nidoStatus(account)
  const ask = status.state === 'ask' ? status.ask : lumensplitGrants()
  return requestSession({ account, grants: ask, base: NIDO_BASE, friendbotUrl })
}

/** Record Nido's answer after it sends the owner back here. Call once on load. */
export const resumeNidoSession = () => resumeSession({ base: NIDO_BASE, server, networkPassphrase: PASSPHRASE })

/** Re-read the account's rules on chain (the source of truth for what was approved). */
export const checkNidoSession = (account: string) => checkSession(account, server, PASSPHRASE)

export { activeSession, forgetSession, onSessionChange, submitWithSession, describeNido }
export type { SessionStatus }
