import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { WatchWalletChanges } from '@stellar/freighter-api'
import { connectWallet, setActiveAddress, type Address } from './lib/lumensplit'
import { humanizeError } from './lib/errors'
import { ensureFunded } from './lib/profile'
import { clearCachedAddress } from './lib/nido/wallet/index'
import { connectNido, isSmartAccount } from './lib/nido'

const KEY = 'lumensplit.address'

interface WalletState {
  address: Address | null
  connecting: boolean
  /** True while a brand-new testnet account is being activated with Friendbot. */
  activating: boolean
  error: string | null
  connect: () => Promise<void>
  /** Sign in with a passkey smart account (Nido). */
  connectPasskey: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletState | null>(null)

function initial(): Address | null {
  let a: Address | null = null
  try {
    a = localStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  setActiveAddress(a)
  return a
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(initial)
  const [connecting, setConnecting] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = useCallback(async (a: Address) => {
    setActivating(true)
    try {
      await ensureFunded(a)
    } finally {
      setActivating(false)
    }
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const a = await connectWallet()
      // A new Freighter account doesn't exist on testnet until it has XLM.
      await activate(a)
      setActiveAddress(a)
      setAddress(a)
      try {
        localStorage.setItem(KEY, a)
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(humanizeError(e))
    } finally {
      setConnecting(false)
    }
  }, [activate])

  const connectPasskey = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const a = await connectNido()
      setActiveAddress(a)
      setAddress(a)
      try {
        localStorage.setItem(KEY, a)
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(humanizeError(e))
    } finally {
      setConnecting(false)
    }
  }, [])

  // Remembered or switched-to accounts may be new too (connect() already covers its own).
  useEffect(() => {
    if (address && !connecting && !isSmartAccount(address)) activate(address).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Follow account switches in Freighter: without this the app keeps acting as
  // the previous account (e.g. /join says "already a member").
  useEffect(() => {
    // A passkey account is not in Freighter: don't let Freighter's account replace it.
    if (!address || isSmartAccount(address)) return
    const watcher = new WatchWalletChanges(1000)
    watcher.watch(({ address: next }) => {
      if (!next || next === address) return
      setActiveAddress(next)
      setAddress(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* ignore */
      }
    })
    return () => watcher.stop()
  }, [address])

  const disconnect = useCallback(() => {
    if (isSmartAccount(address)) clearCachedAddress()
    setActiveAddress(null)
    setAddress(null)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }, [address])

  return (
    <WalletContext.Provider value={{ address, connecting, activating, error, connect, connectPasskey, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>')
  return ctx
}
