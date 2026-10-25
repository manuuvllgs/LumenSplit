/**
 * In-browser mock of the LumenSplit contract. Mirrors the contract's rules
 * (equal split, remainder to the first participants, settle validations,
 * same error codes) so the UI behaves the same once wired to testnet.
 * State lives in localStorage so it survives reloads.
 */
import { getAddress, isConnected, requestAccess } from '@stellar/freighter-api'
import { contractError, ContractError, LumenSplitError } from './errors'
import { setAlias } from './aliases'
import type { Address, Balances, Expense, Group, Transfer, TxOptions, TxResult } from './lumensplit'

const STORE_KEY = 'lumensplit.mock.v1'
const MOCK_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' // native XLM SAC (testnet)
const DEMO_ME = 'GDMKLOCA52HOV5MY2IWTP5CJFIYJB7G5U3U47WZM3AZHXNBWVFHQNVZD'
const DEMO_FRIENDS: [Address, string][] = [
  ['GALQ7IYEPLZGU3MH3TMIMRKJS64J6C2PB7AD7YRETFATY2O6FECUBB43', 'Ana'],
  ['GCVOEIV6HYM7TOQ7EF56F4Z3EIS6AVKGRKU6ZEZFNFBCIRE456XTVKCM', 'Bruno'],
  ['GB5TUJGCNMHIHB7WSZNY36ZDO24G6DK53FNR5NNPGKDJ4JC4MDCWRGZH', 'Carla'],
]
const XLM = 10_000_000n

interface StoredGroup {
  id: number
  name: string
  token: Address
  members: Address[]
  balances: Record<Address, string> // bigint as string for JSON
  expenses: (Omit<Expense, 'amount'> & { amount: string })[]
}

interface Store {
  groups: StoredGroup[]
  seededFor: Address[]
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    /* ignore */
  }
  return { groups: [], seededFor: [] }
}

function save(s: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fakeHash = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')

async function fakeTx(opts?: TxOptions): Promise<string> {
  opts?.onPhase?.('signing')
  await delay(700)
  opts?.onPhase?.('submitting')
  await delay(1100)
  return fakeHash()
}

function find(s: Store, groupId: number): StoredGroup {
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) throw contractError(ContractError.GroupNotFound)
  return g
}

function bal(g: StoredGroup, a: Address): bigint {
  return BigInt(g.balances[a] ?? '0')
}

function applyExpense(g: StoredGroup, payer: Address, amount: bigint, description: string, participants: Address[], ts: number) {
  if (!g.members.includes(payer)) throw contractError(ContractError.NotAMember)
  if (amount <= 0n) throw contractError(ContractError.InvalidAmount)
  if (participants.length === 0) throw contractError(ContractError.NoParticipants)
  if (participants.some((p) => !g.members.includes(p))) throw contractError(ContractError.NotAMember)
  const n = BigInt(participants.length)
  const share = amount / n
  const rem = amount % n
  g.balances[payer] = (bal(g, payer) + amount).toString()
  participants.forEach((p, i) => {
    const owed = share + (BigInt(i) < rem ? 1n : 0n)
    g.balances[p] = (bal(g, p) - owed).toString()
  })
  g.expenses.push({ payer, amount: amount.toString(), description, participants, timestamp: ts })
}

function seedDemo(s: Store, me: Address) {
  if (s.seededFor.includes(me)) return
  s.seededFor.push(me)
  const [ana, bruno, carla] = DEMO_FRIENDS.map(([a]) => a)
  DEMO_FRIENDS.forEach(([a, name]) => setAlias(a, name))
  const g: StoredGroup = {
    id: s.groups.length + 1,
    name: 'Viaje a Sintra',
    token: MOCK_TOKEN,
    members: [me, ana, bruno, carla],
    balances: {},
    expenses: [],
  }
  g.members.forEach((m) => (g.balances[m] = '0'))
  const now = Math.floor(Date.now() / 1000)
  applyExpense(g, ana, 60n * XLM, 'Cena en Lisboa', [me, ana, bruno, carla], now - 86400)
  applyExpense(g, me, 20n * XLM, 'Taxi al hotel', [me, bruno], now - 50000)
  applyExpense(g, bruno, 45n * XLM, 'Entradas Palacio da Pena', [me, bruno, carla], now - 7200)
  s.groups.push(g)
}

function toGroup(g: StoredGroup): Group {
  return { id: g.id, name: g.name, token: g.token, members: [...g.members] }
}

// ── API ───────────────────────────────────────────────────────────────────

export async function connectWallet(): Promise<Address> {
  // Real Freighter when available; otherwise a demo account so the UI is usable without the extension.
  try {
    const conn = await isConnected()
    if (conn.isConnected) {
      const res = await requestAccess()
      if (res.error) throw new LumenSplitError(res.error.message ?? 'Freighter ha rechazado la conexión')
      if (res.address) return res.address
      const again = await getAddress()
      if (again.address) return again.address
    }
  } catch (e) {
    if (e instanceof LumenSplitError) throw e
  }
  await delay(300)
  return DEMO_ME
}

export async function createGroup(creator: Address, name: string, members: Address[], opts?: TxOptions) {
  const all = members.includes(creator) ? members : [creator, ...members]
  if (new Set(all).size !== all.length) throw contractError(ContractError.DuplicateMember)
  const hash = await fakeTx(opts)
  const s = load()
  const g: StoredGroup = {
    id: s.groups.length + 1,
    name,
    token: MOCK_TOKEN,
    members: all,
    balances: Object.fromEntries(all.map((m) => [m, '0'])),
    expenses: [],
  }
  s.groups.push(g)
  save(s)
  return { hash, groupId: g.id }
}

export async function addExpense(
  groupId: number,
  payer: Address,
  amount: bigint,
  description: string,
  participants: Address[],
  opts?: TxOptions,
): Promise<TxResult> {
  // Validate before "signing" so errors show up immediately, like a failed simulation.
  applyExpense(structuredClone(find(load(), groupId)), payer, amount, description, participants, 0)
  const hash = await fakeTx(opts)
  const s = load()
  applyExpense(find(s, groupId), payer, amount, description, participants, Math.floor(Date.now() / 1000))
  save(s)
  return { hash }
}

function checkSettle(g: StoredGroup, from: Address, to: Address, amount: bigint) {
  if (from === to) throw contractError(ContractError.SelfSettlement)
  if (amount <= 0n) throw contractError(ContractError.InvalidAmount)
  if (!g.members.includes(from) || !g.members.includes(to)) throw contractError(ContractError.NotAMember)
  const debt = -bal(g, from)
  const credit = bal(g, to)
  if (debt <= 0n || credit <= 0n) throw contractError(ContractError.NothingToSettle)
  if (amount > debt || amount > credit) throw contractError(ContractError.AmountTooLarge)
}

export async function settle(groupId: number, from: Address, to: Address, amount: bigint, opts?: TxOptions): Promise<TxResult> {
  checkSettle(find(load(), groupId), from, to, amount)
  const hash = await fakeTx(opts)
  const s = load()
  const g = find(s, groupId)
  checkSettle(g, from, to, amount)
  g.balances[from] = (bal(g, from) + amount).toString()
  g.balances[to] = (bal(g, to) - amount).toString()
  save(s)
  return { hash }
}

export async function getGroup(groupId: number): Promise<Group> {
  await delay(150)
  return toGroup(find(load(), groupId))
}

export async function getBalances(groupId: number): Promise<Balances> {
  await delay(150)
  const g = find(load(), groupId)
  return Object.fromEntries(g.members.map((m) => [m, bal(g, m)]))
}

export async function getExpenses(groupId: number): Promise<Expense[]> {
  await delay(150)
  return find(load(), groupId).expenses.map((e) => ({ ...e, amount: BigInt(e.amount) }))
}

export async function suggestSettlements(groupId: number): Promise<Transfer[]> {
  await delay(150)
  const g = find(load(), groupId)
  const debtors = g.members.map((a) => ({ a, v: -bal(g, a) })).filter((x) => x.v > 0n)
  const creditors = g.members.map((a) => ({ a, v: bal(g, a) })).filter((x) => x.v > 0n)
  const out: Transfer[] = []
  const byDesc = (x: { v: bigint }, y: { v: bigint }) => (y.v > x.v ? 1 : y.v < x.v ? -1 : 0)
  while (debtors.length && creditors.length) {
    debtors.sort(byDesc)
    creditors.sort(byDesc)
    const d = debtors[0]
    const c = creditors[0]
    const amt = d.v < c.v ? d.v : c.v
    out.push({ from: d.a, to: c.a, amount: amt })
    d.v -= amt
    c.v -= amt
    if (d.v === 0n) debtors.shift()
    if (c.v === 0n) creditors.shift()
  }
  return out
}

export async function listMyGroups(address: Address): Promise<Group[]> {
  await delay(250)
  const s = load()
  seedDemo(s, address)
  save(s)
  return s.groups.filter((g) => g.members.includes(address)).map(toGroup).reverse()
}
