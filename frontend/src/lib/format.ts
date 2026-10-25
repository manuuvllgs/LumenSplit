import { StrKey } from '@stellar/stellar-sdk'

export const DECIMALS = 7
const UNIT = 10n ** BigInt(DECIMALS)

export const TOKEN_SYMBOL: string = import.meta.env.VITE_TOKEN_SYMBOL || 'XLM'
export const NETWORK: string = import.meta.env.VITE_NETWORK || 'testnet'

/** 125_000_000n → "12,50" (2–7 decimals, Spanish style). */
export function formatAmount(value: bigint, withSymbol = true, maxDecimals = DECIMALS): string {
  const neg = value < 0n
  const abs = neg ? -value : value
  const int = abs / UNIT
  let frac = (abs % UNIT).toString().padStart(DECIMALS, '0').slice(0, maxDecimals).replace(/0+$/, '')
  if (frac.length < 2) frac = frac.padEnd(2, '0')
  const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}${intStr},${frac}${withSymbol ? ` ${TOKEN_SYMBOL}` : ''}`
}

/** "12,5" or "12.5" → 125_000_000n. Returns null if not a valid positive amount. */
export function parseAmount(input: string): bigint | null {
  const s = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{0,7})?$/.test(s)) return null
  const [i, f = ''] = s.split('.')
  const v = BigInt(i) * UNIT + BigInt(f.padEnd(DECIMALS, '0'))
  return v > 0n ? v : null
}

/** GABCDEFG…WXYZ → "GABC…WXYZ" */
export function shortAddress(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a
}

export function isValidAddress(a: string): boolean {
  return StrKey.isValidEd25519PublicKey(a.trim())
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/${NETWORK === 'mainnet' ? 'public' : 'testnet'}/tx/${hash}`
}

export function explorerAccountUrl(address: string): string {
  return `https://stellar.expert/explorer/${NETWORK === 'mainnet' ? 'public' : 'testnet'}/account/${address}`
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 430_000_000n → "43" (dot decimal, no grouping) — the format Horizon/Stellar ops expect. */
export function toDecimalString(value: bigint): string {
  const neg = value < 0n
  const abs = neg ? -value : value
  const frac = (abs % UNIT).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${abs / UNIT}${frac ? `.${frac}` : ''}`
}

/** "10.8611" → "10,86" */
export function formatDecimalString(value: string, maxDecimals = 2): string {
  return Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })
}
