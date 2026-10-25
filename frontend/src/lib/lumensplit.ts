/**
 * LumenSplit — integration layer between the React app and the Soroban contract.
 *
 * The UI should only import from this file. Every function has a stable,
 * typed signature; amounts in the UI are human strings/numbers ("12.50"),
 * amounts on-chain are i128 in the token's smallest unit (7 decimals).
 *
 * The contract client is built at runtime from the on-chain contract spec
 * (contract.Client.from), so no code generation step is needed.
 */
import { contract, rpc, Networks } from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

// ---------- Config ----------

export const CONTRACT_ID: string =
  import.meta.env.VITE_CONTRACT_ID ??
  "CAY3ZW4JCDHB52I556P4DIY5BJ7KF3VMNNXE7ZNFOQ223DYSNC6UWEI2";
export const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE: string = Networks.TESTNET;
export const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";

/** Token debts are settled in. Defaults to native XLM on testnet. */
export const TOKEN_ID: string = import.meta.env.VITE_TOKEN_ID ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const DECIMALS = 7;
const UNIT = 10n ** BigInt(DECIMALS);

// ---------- Types used by the UI ----------

export interface Group {
  id: number;
  name: string;
  token: string;
  members: string[];
}

export interface Expense {
  payer: string;
  /** Human amount, e.g. "90" or "12.5" */
  amount: string;
  description: string;
  participants: string[];
  /** Unix seconds */
  timestamp: number;
}

export interface Balance {
  address: string;
  /** Human amount. Positive = is owed money, negative = owes money. */
  amount: string;
  /** Same value as a number, handy for sorting and colouring. */
  value: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: string;
}

export interface TxResult<T = void> {
  value: T;
  hash: string;
  explorerUrl: string;
}

export class LumenSplitError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = "LumenSplitError";
  }
}

// ---------- Amount helpers ----------

/** "12.5" -> 125000000n */
export function toUnits(amount: string | number): bigint {
  const s = String(amount).trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new LumenSplitError("Invalid amount");
  const [whole, frac = ""] = s.split(".");
  if (frac.length > DECIMALS) throw new LumenSplitError("Too many decimals");
  return BigInt(whole) * UNIT + BigInt(frac.padEnd(DECIMALS, "0"));
}

/** 125000000n -> "12.5" */
export function fromUnits(units: bigint | number | string): string {
  const v = BigInt(units);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / UNIT;
  const frac = (abs % UNIT).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

/** "GABCDEFG...XYZ" -> "GABC…WXYZ" */
export function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

// ---------- Errors ----------

const CONTRACT_ERRORS: Record<number, string> = {
  1: "This group does not exist.",
  2: "That address is not a member of the group.",
  3: "The amount must be greater than zero.",
  4: "Choose at least one person to split with.",
  5: "A group needs at least one member.",
  6: "The same member was added twice.",
  7: "There is no debt to settle between these two members.",
  8: "That amount is more than what is owed.",
  9: "You cannot pay yourself.",
};

function toError(e: unknown): LumenSplitError {
  if (e instanceof LumenSplitError) return e;
  const text = e instanceof Error ? e.message : String(e);
  const m = text.match(/Error\(Contract, #(\d+)\)/);
  if (m) {
    const code = Number(m[1]);
    return new LumenSplitError(CONTRACT_ERRORS[code] ?? `Contract error #${code}`, code);
  }
  if (/User declined|rejected/i.test(text)) {
    return new LumenSplitError("Transaction cancelled in Freighter.");
  }
  if (/insufficient|underfunded|balance/i.test(text)) {
    return new LumenSplitError("Not enough funds in your wallet.");
  }
  return new LumenSplitError(text);
}

// ---------- Wallet (Freighter) ----------

let currentAddress: string | null = null;

/** Opens Freighter and asks the user to connect. Returns their G... address. */
export async function connectWallet(): Promise<string> {
  const conn = await isConnected();
  if (!conn.isConnected) {
    throw new LumenSplitError("Freighter is not installed. Get it at freighter.app");
  }
  const res = await requestAccess();
  if (res.error || !res.address) {
    throw new LumenSplitError(res.error?.message ?? "Could not connect to Freighter");
  }
  currentAddress = res.address;
  return res.address;
}

/** Returns the connected address without prompting, or null. */
export async function getConnectedAddress(): Promise<string | null> {
  if (currentAddress) return currentAddress;
  try {
    const res = await getAddress();
    currentAddress = res.address || null;
  } catch {
    currentAddress = null;
  }
  return currentAddress;
}

function requireAddress(): string {
  if (!currentAddress) throw new LumenSplitError("Connect your wallet first.");
  return currentAddress;
}

// ---------- Contract client ----------

// Method names come from the on-chain spec; typed loosely here and narrowed below.
type Dyn = Record<string, (args?: Record<string, unknown>) => Promise<contract.AssembledTransaction<any>>>;

let readClient: Promise<Dyn> | null = null;
const writeClients = new Map<string, Promise<Dyn>>();

function getReadClient(): Promise<Dyn> {
  readClient ??= contract.Client.from({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
  }) as unknown as Promise<Dyn>;
  return readClient;
}

function getWriteClient(address: string): Promise<Dyn> {
  let c = writeClients.get(address);
  if (!c) {
    c = contract.Client.from({
      contractId: CONTRACT_ID,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: address,
      signTransaction: async (xdr, opts) => {
        const res = await signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
          address,
        });
        if (res.error) throw new LumenSplitError(res.error.message ?? "Signing failed");
        return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress };
      },
    }) as unknown as Promise<Dyn>;
    writeClients.set(address, c);
  }
  return c;
}

/** Throws a readable error if simulation failed (e.g. a contract error). */
function checkSimulation(tx: contract.AssembledTransaction<unknown>): void {
  const sim = tx.simulation;
  if (sim && rpc.Api.isSimulationError(sim)) throw toError(sim.error);
}

/** Unwraps Result<T, Error> values coming back from the contract. */
function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "isErr" in value && "unwrap" in value) {
    const r = value as { isErr(): boolean; unwrap(): T; unwrapErr(): { message: string } };
    if (r.isErr()) throw new LumenSplitError(r.unwrapErr().message || "Contract error");
    return r.unwrap();
  }
  return value as T;
}

async function read<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const client = await getReadClient();
    const tx = await client[method](args);
    checkSimulation(tx);
    return unwrap<T>(tx.result);
  } catch (e) {
    throw toError(e);
  }
}

async function write<T>(method: string, args: Record<string, unknown>): Promise<TxResult<T>> {
  const address = requireAddress();
  try {
    const client = await getWriteClient(address);
    const tx = await client[method](args);
    checkSimulation(tx);
    const sent = await tx.signAndSend();
    const hash =
      sent.getTransactionResponse?.txHash ?? sent.sendTransactionResponse?.hash ?? "";
    return { value: unwrap<T>(sent.result), hash, explorerUrl: EXPLORER_TX_URL + hash };
  } catch (e) {
    throw toError(e);
  }
}

// ---------- Decoders ----------

type RawGroup = { id: number; name: string; token: string; members: string[] };
type RawExpense = {
  payer: string;
  amount: bigint;
  description: string;
  participants: string[];
  timestamp: bigint;
};
type RawTransfer = { from: string; to: string; amount: bigint };

const toGroup = (g: RawGroup): Group => ({
  id: Number(g.id),
  name: g.name,
  token: g.token,
  members: [...g.members],
});

/** Contract maps arrive as [key, value][]; accept a JS Map too. */
function entries<K, V>(m: unknown): [K, V][] {
  if (m instanceof Map) return [...m.entries()] as [K, V][];
  if (Array.isArray(m)) return m as [K, V][];
  return Object.entries(m as object) as [K, V][];
}

// ---------- Public API: reads ----------

export async function getGroup(groupId: number): Promise<Group> {
  return toGroup(await read<RawGroup>("get_group", { group_id: groupId }));
}

export async function getGroupCount(): Promise<number> {
  return Number(await read<number>("group_count"));
}

/** Members' balances, biggest creditor first. Keeps the group's member order for ties. */
export async function getBalances(groupId: number): Promise<Balance[]> {
  const raw = await read<unknown>("get_balances", { group_id: groupId });
  return entries<string, bigint>(raw)
    .map(([address, units]) => {
      const amount = fromUnits(units);
      return { address, amount, value: Number(amount) };
    })
    .sort((a, b) => b.value - a.value);
}

export async function getExpenses(groupId: number): Promise<Expense[]> {
  const raw = await read<RawExpense[]>("get_expenses", { group_id: groupId });
  return raw
    .map((e) => ({
      payer: e.payer,
      amount: fromUnits(e.amount),
      description: e.description,
      participants: [...e.participants],
      timestamp: Number(e.timestamp),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function suggestSettlements(groupId: number): Promise<Transfer[]> {
  const raw = await read<RawTransfer[]>("suggest_settlements", { group_id: groupId });
  return raw.map((t) => ({ from: t.from, to: t.to, amount: fromUnits(t.amount) }));
}

/** All groups where `address` is a member. Fine for a hackathon-sized contract. */
export async function listMyGroups(address?: string): Promise<Group[]> {
  const me = address ?? requireAddress();
  const count = await getGroupCount();
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const groups = await Promise.all(ids.map((id) => getGroup(id).catch(() => null)));
  return groups
    .filter((g): g is Group => g !== null && g.members.includes(me))
    .sort((a, b) => b.id - a.id);
}

// ---------- Public API: writes (open Freighter to sign) ----------

/** Creates a group. The connected wallet is always added as a member. Returns the new id. */
export async function createGroup(
  name: string,
  members: string[],
  token: string = TOKEN_ID,
): Promise<TxResult<number>> {
  const me = requireAddress();
  if (!token) throw new LumenSplitError("VITE_TOKEN_ID is not configured.");
  const unique = [...new Set([me, ...members.map((m) => m.trim()).filter(Boolean)])];
  const res = await write<number>("create_group", {
    creator: me,
    name: name.trim(),
    token,
    members: unique,
  });
  return { ...res, value: Number(res.value) };
}

/** Records an expense paid by the connected wallet, split equally among `participants`. */
export async function addExpense(
  groupId: number,
  amount: string | number,
  description: string,
  participants: string[],
): Promise<TxResult> {
  return write("add_expense", {
    group_id: groupId,
    payer: requireAddress(),
    amount: toUnits(amount),
    description: description.trim(),
    participants,
  });
}

/** Pays `amount` from the connected wallet to `to`, moving real tokens on Stellar. */
export async function settle(
  groupId: number,
  to: string,
  amount: string | number,
): Promise<TxResult> {
  return write("settle", {
    group_id: groupId,
    from: requireAddress(),
    to,
    amount: toUnits(amount),
  });
}
