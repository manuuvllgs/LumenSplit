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
      if (res.error) throw new LumenSplitError(res.error.message || 'Has cancelado la firma en Freighter.')
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
      throw new LumenSplitError(res.error?.message || simulationError || 'Error del contrato')
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
async function write<T>(
  publicKey: Address,
  method: string,
  args: Record<string, unknown>,
  opts?: TxOptions,
): Promise<{ hash: string; value: T }> {
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
  timestamp: bigint
}

// ── API ───────────────────────────────────────────────────────────────────

export async function connectWallet(): Promise<Address> {
  const conn = await isConnected()
  if (!conn.isConnected) throw new LumenSplitError('No encontramos Freighter. Instala la extensión y recarga la página.')
  const res = await requestAccess()
  if (res.error || !res.address) throw new LumenSplitError(res.error?.message || 'Freighter ha rechazado la conexión.')
  const net = await getNetworkDetails()
  if (!net.error && net.networkPassphrase && net.networkPassphrase !== PASSPHRASE)
    throw new LumenSplitError('Freighter está en otra red. Cámbiala a Testnet y vuelve a conectar.')
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
  return list.map((e) => ({ ...e, amount: BigInt(e.amount), timestamp: Number(e.timestamp) }))
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
