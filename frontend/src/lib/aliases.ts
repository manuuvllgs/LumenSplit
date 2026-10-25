/** Nicknames for addresses ("GABC…WXYZ" → "Ana"). Never sent on-chain. */
import { useSyncExternalStore } from 'react'
import { shortAddress } from './format'

const KEY = 'lumensplit.aliases'
type Aliases = Record<string, string>

/**
 * Shared names for the team's testnet accounts, so everyone sees the same
 * people in the demo. Aliases set in the app (✎) are stored locally and win.
 */
export const TEAM_ALIASES: Aliases = {
  GABKS54T7RUHRAOBWQYAX7I3PENWUO47RYH6U2HG4CZ646C4NQQW4V4B: 'Ana',
  GBD6R4K5CK6NH2AAHZMABLE3DZPK5REOPPECNXZDWAUR3J5FQNHNCGWT: 'Ben',
  GAB3U3GXL3F5XCKOW5C547CNQNMK6KIO4BGMYYMFJK6HWPKMSLZE5KNJ: 'Carla',
  GBHYIN3ITX5LGZLEMKWQYVVNZXDAARB5MESOR3UXNXHBCMA7P74VDUWM: 'Dani',
}

let local: Aliases = read()
let cache: Aliases = { ...TEAM_ALIASES, ...local }
const listeners = new Set<() => void>()

function read(): Aliases {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Aliases
  } catch {
    return {}
  }
}

export function setAlias(address: string, alias: string) {
  const next = { ...local }
  const v = alias.trim()
  if (v) next[address] = v
  else delete next[address]
  local = next
  cache = { ...TEAM_ALIASES, ...local }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAliases(): Aliases {
  return useSyncExternalStore(subscribe, () => cache)
}

/** Alias if set, otherwise the shortened address. */
export function useDisplayName(): (address: string) => string {
  const aliases = useAliases()
  return (a) => aliases[a] ?? shortAddress(a)
}
