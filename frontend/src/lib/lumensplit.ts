/**
 * LumenSplit data layer — the ONLY module the UI talks to.
 *
 * Backed by the deployed contract (./soroban.ts) when VITE_CONTRACT_ID is set,
 * or by an in-browser mock (./mock.ts) when it is empty or VITE_USE_MOCK=true.
 * Both implement exactly these signatures.
 *
 * Conventions (mirror the Soroban contract):
 * - Amounts are `bigint` in the token's smallest unit (7 decimals: 1 XLM = 10_000_000n).
 * - Balance > 0  → the member is owed money. Balance < 0 → the member owes.
 * - Write functions return the transaction hash so the UI can link to stellar.expert.
 * - Write functions throw `LumenSplitError` (see ./errors.ts) on failure.
 */
import * as mockImpl from './mock'
import * as sorobanImpl from './soroban'

export const isMock: boolean = !import.meta.env.VITE_CONTRACT_ID || import.meta.env.VITE_USE_MOCK === 'true'
const mock = isMock ? mockImpl : sorobanImpl

export type Address = string // Stellar account, "G..."

export interface Group {
  id: number
  name: string
  token: Address
  members: Address[]
}

export interface Expense {
  payer: Address
  amount: bigint
  description: string
  participants: Address[]
  /** Unix time in seconds (ledger timestamp). */
  timestamp: number
}

export interface Transfer {
  from: Address
  to: Address
  amount: bigint
}

/** Address → balance. Every member of the group has an entry (0 if even). */
export type Balances = Record<Address, bigint>

export interface TxResult {
  hash: string
}

/** Progress of a write call, so the UI can show "firma en Freighter…" vs "confirmando…". */
export type TxPhase = 'signing' | 'submitting'

export interface TxOptions {
  onPhase?: (phase: TxPhase) => void
}

// ── Wallet ────────────────────────────────────────────────────────────────

/** Asks Freighter for access and returns the selected account. */
export function connectWallet(): Promise<Address> {
  return mock.connectWallet()
}

// ── Writes (need a signature from the caller) ───────────────────────────────

/** `creator` is added to `members` automatically if missing. */
export function createGroup(
  creator: Address,
  name: string,
  members: Address[],
  opts?: TxOptions,
): Promise<TxResult & { groupId: number }> {
  return mock.createGroup(creator, name, members, opts)
}

export function addExpense(
  groupId: number,
  payer: Address,
  amount: bigint,
  description: string,
  participants: Address[],
  opts?: TxOptions,
): Promise<TxResult> {
  return mock.addExpense(groupId, payer, amount, description, participants, opts)
}

export function settle(
  groupId: number,
  from: Address,
  to: Address,
  amount: bigint,
  opts?: TxOptions,
): Promise<TxResult> {
  return mock.settle(groupId, from, to, amount, opts)
}

// ── Reads (simulation only, no signature) ─────────────────────────────────

export function getGroup(groupId: number): Promise<Group> {
  return mock.getGroup(groupId)
}

export function getBalances(groupId: number): Promise<Balances> {
  return mock.getBalances(groupId)
}

/** Oldest first, as stored by the contract. */
export function getExpenses(groupId: number): Promise<Expense[]> {
  return mock.getExpenses(groupId)
}

export function suggestSettlements(groupId: number): Promise<Transfer[]> {
  return mock.suggestSettlements(groupId)
}

/**
 * Groups where `address` is a member. The contract has no index for this, so
 * the real version loops `group_count()` + `get_group(1..N)` and filters.
 */
export function listMyGroups(address: Address): Promise<Group[]> {
  return mock.listMyGroups(address)
}
