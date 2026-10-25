/**
 * Display names, in priority order:
 * 1. `mine`: the alias YOU chose for your own account(s), stored locally — instant, no signature.
 * 2. `chosen`: the name each person published on their Stellar account (see ./profile.ts).
 * 3. `hints`: names a group creator typed for an address on this device.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { shortAddress } from './format'
import { fetchName, saveMyName } from './profile'
import type { TxOptions } from './lumensplit'
import { isSmartAccount } from './nido'

const HINTS_KEY = 'lumensplit.aliases'
const MINE_KEY = 'lumensplit.myNames'
type Names = Record<string, string>

/** address → chosen name, or null once we know there is none. Missing = not fetched yet. */
const chosen: Record<string, string | null> = {}
const inFlight = new Set<string>()
let hints: Names = readJson(HINTS_KEY)
let mine: Names = readJson(MINE_KEY)
let cache: Names = merge()
const listeners = new Set<() => void>()

function readJson(key: string): Names {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as Names
  } catch {
    return {}
  }
}

function writeJson(key: string, value: Names) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function merge(): Names {
  const out: Names = { ...hints }
  for (const [a, n] of Object.entries(chosen)) if (n) out[a] = n // their own published choice
  return { ...out, ...mine } // my alias for myself always wins on my device
}

/** Saves MY alias for my own account on this device (no signature). */
export function setMyName(address: string, name: string) {
  mine = { ...mine, [address]: name.trim() }
  writeJson(MINE_KEY, mine)
  notify()
}

/**
 * My name: local alias, else the one published on my account. string, null
 * (none anywhere) or undefined (still checking the network).
 */
export function useMyName(address: string | null | undefined): string | null | undefined {
  const published = useChosenName(address)
  if (!address) return undefined
  return mine[address] ?? published
}

function notify() {
  cache = merge()
  listeners.forEach((l) => l())
}

/** Starts loading the chosen name of `address` (no-op if known or loading). */
export function requestName(address: string | null | undefined) {
  if (!address || address in chosen || inFlight.has(address)) return
  inFlight.add(address)
  fetchName(address)
    .then((n) => {
      chosen[address] = n
    })
    .catch(() => {
      /* leave unknown; retried next time it is requested */
    })
    .finally(() => {
      inFlight.delete(address)
      notify()
    })
}

/** After saving my own name, show it right away without re-fetching. */
export function setChosenName(address: string, name: string) {
  chosen[address] = name.trim()
  notify()
}

/** Name the group creator gave someone on this device (used until they choose their own). */
export function setHint(address: string, name: string) {
  const v = name.trim()
  hints = { ...hints }
  if (v) hints[address] = v
  else delete hints[address]
  writeJson(HINTS_KEY, hints)
  notify()
}

/** The name published on `address` (no hooks), or undefined if not loaded yet. */
export function publishedName(address: string): string | null | undefined {
  return chosen[address]
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAliases(): Names {
  return useSyncExternalStore(subscribe, () => cache)
}

/** Loads names for these addresses and re-renders when they arrive. */
export function useNames(addresses: (string | null | undefined)[]): Names {
  const key = addresses.filter(Boolean).join(',')
  useEffect(() => {
    key.split(',').forEach((a) => requestName(a))
  }, [key])
  return useAliases()
}

/**
 * The name `address` chose for itself: string, null (none chosen) or
 * undefined (still loading). Hints don't count here.
 */
export function useChosenName(address: string | null | undefined): string | null | undefined {
  useAliases() // subscribe
  useEffect(() => requestName(address), [address])
  return address ? chosen[address] : undefined
}

/** Name if known, otherwise the shortened address. */
export function useDisplayName(): (address: string) => string {
  const names = useAliases()
  return (a) => {
    requestName(a)
    return names[a] ?? shortAddress(a)
  }
}

// ── Pending names for a group (chosen by the creator, claimed by whoever joins) ──

const PENDING_KEY = (groupId: number) => `lumensplit.pending.${groupId}`

export function getPendingNames(groupId: number): string[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY(groupId)) || '[]') as string[]
  } catch {
    return []
  }
}

export function setPendingNames(groupId: number, names: string[]) {
  try {
    localStorage.setItem(PENDING_KEY(groupId), JSON.stringify(names))
  } catch {
    /* ignore */
  }
}

/**
 * Publishes my alias on my Stellar account so friends see it, unless it is
 * already there. Returns the tx hash, or null if nothing had to be done.
 */
export async function publishMyNameIfNeeded(address: string, opts?: TxOptions): Promise<string | null> {
  const name = mine[address]
  if (!name) return null
  // Passkey smart accounts can't store data entries: their name stays on this device.
  if (isSmartAccount(address)) return null
  if (!(address in chosen)) chosen[address] = await fetchName(address).catch(() => null)
  if (chosen[address] === name) return null
  const { hash } = await saveMyName(address, name, opts)
  setChosenName(address, name)
  return hash
}
