/** Local-only nicknames for addresses ("GABC…WXYZ" → "Ana"). Never sent on-chain. */
import { useSyncExternalStore } from 'react'
import { shortAddress } from './format'

const KEY = 'lumensplit.aliases'
type Aliases = Record<string, string>

let cache: Aliases = read()
const listeners = new Set<() => void>()

function read(): Aliases {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Aliases
  } catch {
    return {}
  }
}

export function setAlias(address: string, alias: string) {
  const next = { ...cache }
  const v = alias.trim()
  if (v) next[address] = v
  else delete next[address]
  cache = next
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
