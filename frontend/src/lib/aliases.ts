/**
 * Display names. Each person picks their own (stored on their Stellar account,
 * see ./profile.ts); this module fetches and caches them for the UI.
 *
 * `hints` are names a group creator typed for an address in this browser; they
 * are only used until that person chooses a name of their own.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { shortAddress } from './format'
import { fetchName } from './profile'

const HINTS_KEY = 'lumensplit.aliases'
type Names = Record<string, string>

/** address → chosen name, or null once we know there is none. Missing = not fetched yet. */
const chosen: Record<string, string | null> = {}
const inFlight = new Set<string>()
let hints: Names = readHints()
let cache: Names = merge()
const listeners = new Set<() => void>()

function readHints(): Names {
  try {
    return JSON.parse(localStorage.getItem(HINTS_KEY) || '{}') as Names
  } catch {
    return {}
  }
}

function merge(): Names {
  const out: Names = { ...hints }
  for (const [a, n] of Object.entries(chosen)) if (n) out[a] = n // own choice wins
  return out
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
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify(hints))
  } catch {
    /* ignore */
  }
  notify()
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
