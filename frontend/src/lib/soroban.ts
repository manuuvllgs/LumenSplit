/**
 * Real implementation against the deployed LumenSplit contract.
 *
 * Uses `contract.Client.from()`, which downloads the contract spec from the
 * network and builds the same typed-ish client that `stellar contract bindings
 * typescript` generates — no CLI or generated package needed.
 */
import { contract, Networks } from '@stellar/stellar-sdk'
import { getNetworkDetails, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api'
import { contractError, LumenSplitError } from './errors'
import type { Address, Balances, Expense, Group, Transfer, TxOptions, TxResult } from './lumensplit'
import { t } from '../i18n'
import { activeSession, describeNido, isSmartAccount, server as nidoServer, submitWithSession } from './nido'

const CONTRACT_ID: string = import.meta.env.VITE_CONTRACT_ID
const TOKEN_ID: string = import.meta.env.VITE_TOKEN_ID
const RPC_URL: string = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org'
const PASSPHRASE = import.meta.env.VITE_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET


// Minimal view of the dynamic client: one method per contract fn.
type Call = (args?: Record<string, unknown>) => Promise<contract.AssembledTransaction<unknown>>
type LumenSplitClient = contract.Client & Record<string, Call>

const baseOptions = { contractId: CONTRACT_ID, rpcUrl: RPC_URL, networkPassphrase: PASSPHRASE }

let readClient: Promise<LumenSplitClient> | null = null
function reader(): Promise<LumenSplitClient> {
  readClient ??= contract.Client.from(baseOptions).catch((e) => {
    readClient = null
    throw e
  }) as Promise<LumenSplitClient>
  return readClient
}

/** A client whose transactions are built for `publicKey` and signed with Freighter. */
async function writer(publicKey: Address, opts?: TxOptions): Promise<LumenSplitClient> {
  const { spec } = await reader()
  return new contract.Client(spec, {
    ...baseOptions,
    publicKey,
    signTransaction: async (xdr: string) => {
      opts?.onPhase?.('signing')
      const res = await signTransaction(xdr, { networkPassphrase: PASSPHRASE, address: publicKey })
      if (res.error) throw new LumenSplitError(res.error.message || t('Has cancelado la firma en Freighter.'))
      opts?.onPhase?.('submitting')
      return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress }
    },
  }) as LumenSplitClient
}

/**
 * Unwraps a contract Result (Ok/Err) or a plain value. The SDK's Err carries an
 * empty message (our error enum has no doc comments), so we read the code from
 * the simulation error, which looks like "HostError: Error(Contract, #7)".
 */
function unwrap<T>(r: unknown, simulationError?: string): T {
  const res = r as { isErr?: () => boolean; unwrap?: () => T; error?: { message?: string } }
  if (typeof res?.isErr === 'function') {
    if (res.isErr()) {
      const code = simulationError?.match(/Error\(Contract, #(\d+)\)/)?.[1]
      if (code) throw contractError(Number(code))
      throw new LumenSplitError(res.error?.message || simulationError || t('Error del contrato'))
    }
    return res.unwrap!()
  }
  return r as T
}

function simError(tx: contract.AssembledTransaction<unknown>): string | undefined {
  const sim = tx.simulation as { error?: string } | undefined
  return sim?.error
}

async function read<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const c = await reader()
  const tx = await c[method](args)
  return unwrap<T>(tx.result, simError(tx))
}

/** Simulate, fail early on contract errors, then sign with Freighter and send. */
/**
 * Passkey (Nido) smart account: the call is simulated without a source (a
 * `C…` address can't source a transaction) and then signed by this app's
 * session key under the rules the owner approved on Nido. No prompt.
 */
async function writeAsSmartAccount<T>(
  account: Address,
  method: string,
  args: Record<string, unknown>,
  opts?: TxOptions,
): Promise<{ hash: string; value: T }> {
  const session = activeSession(account)
  if (!session) throw new LumenSplitError(t('Autoriza LumenSplit en Nido para poder hacer esto.'))
  const c = await reader()
  const tx = await c[method](args)
  unwrap(tx.result, simError(tx)) // contract errors read the same way as with Freighter
  opts?.onPhase?.('submitting')
  try {
    const { result, hash } = await submitWithSession(tx, session, nidoServer, PASSPHRASE)
    return { hash, value: unwrap<T>(result) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = msg.match(/Error\(Contract, #(\d+)\)/)?.[1]
    // Our contract's errors are 1–12; the account's own refusals are #3xxx.
    if (code && Number(code) < 1000) throw contractError(Number(code))
    throw new LumenSplitError(describeNido(e))
  }
}

async function write<T>(
  publicKey: Address,
  method: string,
  args: Record<string, unknown>,
  opts?: TxOptions,
): Promise<{ hash: string; value: T }> {
  if (isSmartAccount(publicKey)) return writeAsSmartAccount<T>(publicKey, method, args, opts)
  const c = await writer(publicKey, opts)
  opts?.onPhase?.('signing')
  const tx = await c[method](args)
  unwrap(tx.result, simError(tx)) // throws readable error if the simulation failed
  const sent = await tx.signAndSend()
  const hash = sent.sendTransactionResponse?.hash ?? sent.getTransactionResponse?.txHash ?? ''
  return { hash, value: unwrap<T>(sent.result) }
}

interface RawExpense {
  payer: Address
  amount: bigint
  description: string
  participants: Address[]
  shares?: bigint[]
  timestamp: bigint
}

// ── API ───────────────────────────────────────────────────────────────────

export async function connectWallet(): Promise<Address> {
  const conn = await isConnected()
  if (!conn.isConnected) throw new LumenSplitError(t('No encontramos Freighter. Instala la extensión y recarga la página.'))
  const res = await requestAccess()
  if (res.error || !res.address) throw new LumenSplitError(res.error?.message || t('Freighter ha rechazado la conexión.'))
  const net = await getNetworkDetails()
  if (!net.error && net.networkPassphrase && net.networkPassphrase !== PASSPHRASE)
    throw new LumenSplitError(t('Freighter está en otra red. Cámbiala a Testnet y vuelve a conectar.'))
  return res.address
}

export async function createGroup(creator: Address, name: string, members: Address[], opts?: TxOptions) {
  const all = members.includes(creator) ? members : [creator, ...members]
  const { hash, value } = await write<number>(creator, 'create_group', { creator, name, token: TOKEN_ID, members: all }, opts)
  return { hash, groupId: Number(value) }
}

export async function addExpense(
  groupId: number,
  payer: Address,
  amount: bigint,
  description: string,
  participants: Address[],
  opts?: TxOptions,
): Promise<TxResult> {
  const { hash } = await write(payer, 'add_expense', { group_id: groupId, payer, amount, description, participants }, opts)
  return { hash }
}

export async function settle(groupId: number, from: Address, to: Address, amount: bigint, opts?: TxOptions): Promise<TxResult> {
  const { hash } = await write(from, 'settle', { group_id: groupId, from, to, amount }, opts)
  return { hash }
}

export async function getGroup(groupId: number): Promise<Group> {
  const g = await read<Group>('get_group', { group_id: groupId })
  return { id: Number(g.id), name: g.name, token: g.token, members: [...g.members] }
}

export async function getBalances(groupId: number): Promise<Balances> {
  const [group, raw] = await Promise.all([
    getGroup(groupId),
    read<Map<Address, bigint> | [Address, bigint][]>('get_balances', { group_id: groupId }),
  ])
  const entries = raw instanceof Map ? [...raw.entries()] : raw
  const out: Balances = Object.fromEntries(group.members.map((m) => [m, 0n]))
  for (const [a, v] of entries) out[a] = BigInt(v)
  return out
}

export async function getExpenses(groupId: number): Promise<Expense[]> {
  const list = await read<RawExpense[]>('get_expenses', { group_id: groupId })
  return list.map((e) => ({
    ...e,
    amount: BigInt(e.amount),
    shares: (e.shares ?? []).map((x) => BigInt(x)),
    timestamp: Number(e.timestamp),
  }))
}

export async function suggestSettlements(groupId: number): Promise<Transfer[]> {
  const list = await read<Transfer[]>('suggest_settlements', { group_id: groupId })
  return list.map((t) => ({ from: t.from, to: t.to, amount: BigInt(t.amount) }))
}

export async function listMyGroups(address: Address): Promise<Group[]> {
  const n = Number(await read<number>('group_count'))
  const ids = Array.from({ length: n }, (_, i) => n - i) // newest first
  const groups = await Promise.all(ids.map((id) => getGroup(id).catch(() => null)))
  return groups.filter((g): g is Group => !!g && g.members.includes(address))
}

// ── Phase 2: settle all, invitations, custom splits ───────────────────────

/** Pays every debt `from` has in the group in one transaction (one signature). */
export async function settleAll(
  groupId: number,
  from: Address,
  opts?: TxOptions,
): Promise<TxResult & { transfers: Transfer[] }> {
  const { hash, value } = await write<Transfer[]>(from, 'settle_all', { group_id: groupId, from }, opts)
  const transfers = (value ?? []).map((t) => ({ from: t.from, to: t.to, amount: BigInt(t.amount) }))
  return { hash, transfers }
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new LumenSplitError(t('El enlace de invitación no es válido.'))
  }
  return Uint8Array.from(clean.match(/../g)!.map((h) => parseInt(h, 16)))
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
}

/** The shareable link. The code goes after `#`, so it never reaches any server. */
export function inviteLink(groupId: number, code: string): string {
  return `${window.location.origin}/join/${groupId}#${code}`
}

/**
 * Creates (or replaces) the group's invitation. Only the SHA-256 of a random
 * 16-byte code is stored on-chain; the code itself only lives in the link.
 */
export async function createInvite(
  groupId: number,
  member: Address,
  opts?: TxOptions,
): Promise<TxResult & { code: string; link: string }> {
  const secret = crypto.getRandomValues(new Uint8Array(16))
  const code = toHex(secret)
  const codeHash = await sha256(secret)
  const { hash } = await write(member, 'create_invite', { group_id: groupId, member, code_hash: codeHash }, opts)
  return { hash, code, link: inviteLink(groupId, code) }
}

/** Joins a group with the code from an invitation link (the part after `#`). */
export async function joinGroup(groupId: number, member: Address, code: string, opts?: TxOptions): Promise<TxResult> {
  const { hash } = await write(member, 'join_group', { group_id: groupId, member, code: fromHex(code) }, opts)
  return { hash }
}

/** Records an expense where each participant owes a different amount. */
export async function addExpenseCustom(
  groupId: number,
  payer: Address,
  description: string,
  shares: { address: Address; amount: bigint }[],
  opts?: TxOptions,
): Promise<TxResult> {
  const { hash } = await write(
    payer,
    'add_expense_custom',
    {
      group_id: groupId,
      payer,
      description,
      shares: shares.map((s) => ({ member: s.address, amount: s.amount })),
    },
    opts,
  )
  return { hash }
}
