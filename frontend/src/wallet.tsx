import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
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
