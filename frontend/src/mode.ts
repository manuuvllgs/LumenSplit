/** Light / dark mode: follows the OS until the user picks one, then remembers it. */
import { useSyncExternalStore } from 'react'

export type Mode = 'light' | 'dark'
const KEY = 'lumensplit.mode'
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const listeners = new Set<() => void>()

function current(): Mode {
  const set = document.documentElement.dataset.mode
  if (set === 'light' || set === 'dark') return set
  return media?.matches ? 'dark' : 'light'
}

export function setMode(mode: Mode) {
  document.documentElement.dataset.mode = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  media?.addEventListener('change', l)
  return () => {
    listeners.delete(l)
    media?.removeEventListener('change', l)
  }
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, current, () => 'light')
}
