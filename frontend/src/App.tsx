import type { ReactNode } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { isMock } from './lib/lumensplit'
import { shortAddress } from './lib/format'
import { useWallet, WalletProvider } from './wallet'
import Home from './pages/Home'
import NewGroup from './pages/NewGroup'
import GroupDetail from './pages/GroupDetail'
import AddExpense from './pages/AddExpense'
import Settle from './pages/Settle'

function Shell({ children }: { children: ReactNode }) {
  const { address, disconnect } = useWallet()
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink-900">
          <img src="/logo-mark.svg" alt="" className="h-8 w-8" />
          LumenSplit
        </Link>
        <div className="flex items-center gap-2">
          {isMock && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">DEMO</span>
          )}
          {address && (
            <button
              onClick={disconnect}
              title="Desconectar"
              className="rounded-full bg-white px-3 py-1 font-mono text-xs text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100"
            >
              {shortAddress(address)}
            </button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

/** Every page except Home needs a connected wallet. */
function RequireWallet({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  return address ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <WalletProvider>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<RequireWallet><NewGroup /></RequireWallet>} />
            <Route path="/g/:id" element={<RequireWallet><GroupDetail /></RequireWallet>} />
            <Route path="/g/:id/expense" element={<RequireWallet><AddExpense /></RequireWallet>} />
            <Route path="/g/:id/settle" element={<RequireWallet><Settle /></RequireWallet>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </HashRouter>
    </WalletProvider>
  )
}
