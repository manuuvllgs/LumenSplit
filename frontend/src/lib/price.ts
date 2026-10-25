/**
 * XLM → EUR market price, to show amounts "≈ € …" next to XLM.
 * Real market rate from CoinGecko's public API (no key, CORS enabled), fetched
 * once and cached for 10 minutes. If it can't be fetched, nothing is shown:
 * we never display an invented number.
 */
import { useSyncExternalStore } from 'react'
import { locale } from '../i18n'

const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=eur'
const KEY = 'lumensplit.xlmEur'
const TTL_MS = 10 * 60 * 1000
const UNIT = 10_000_000n

let rate: number | null = null
let fetchedAt = 0
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

try {
  const cached = JSON.parse(localStorage.getItem(KEY) || 'null') as { rate: number; at: number } | null
  if (cached && Date.now() - cached.at < TTL_MS && cached.rate > 0) {
    rate = cached.rate
    fetchedAt = cached.at
  }
} catch {
  /* ignore */
}

function refresh() {
  if (inFlight || (rate !== null && Date.now() - fetchedAt < TTL_MS)) return
  inFlight = fetch(URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { stellar?: { eur?: number } }) => {
      const eur = j.stellar?.eur
      if (typeof eur === 'number' && eur > 0) {
        rate = eur
        fetchedAt = Date.now()
        try {
          localStorage.setItem(KEY, JSON.stringify({ rate, at: fetchedAt }))
        } catch {
          /* ignore */
        }
        listeners.forEach((l) => l())
      }
    })
    .catch(() => {
      /* no rate: amounts simply show without the euro hint */
    })
    .finally(() => {
      inFlight = null
    })
}

/** Current XLM→EUR rate, or null while unknown. Triggers a fetch when stale. */
export function useXlmEur(): number | null {
  refresh()
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => rate,
  )
}

/** 125_000_000n stroops at 0.25 €/XLM → "3,13 €" (locale-aware). */
export function formatEur(units: bigint, xlmEur: number): string {
  const xlm = Number(units / UNIT) + Number(units % UNIT) / 1e7
  const eur = Math.abs(xlm * xlmEur)
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: eur < 0.1 ? 4 : 2,
  }).format(eur)
}
