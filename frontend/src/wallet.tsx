import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { WatchWalletChanges } from '@stellar/freighter-api'
import { connectWallet, setActiveAddress, type Address } from './lib/lumensplit'
import { humanizeError } from './lib/errors'

const KEY = 'lumensplit.address'

interface WalletState {
  address: Address | null
  connecting: boolean
  error: string | null
  connect: () => Promise<void>
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
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const a = await connectWallet()
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

  // Follow account switches in Freighter: without this the app keeps acting as
  // the previous account (e.g. /join says "already a member").
  useEffect(() => {
    if (!address) return
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
    setActiveAddress(null)
    setAddress(null)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <WalletContext.Provider value={{ address, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>')
  return ctx
}
