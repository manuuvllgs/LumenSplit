import type { ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { isMock } from './lib/lumensplit'
import { useAliases } from './lib/aliases'
import { KeyHint } from './components/ui'
import { useWallet, WalletProvider } from './wallet'
import Home from './pages/Home'
import NewGroup from './pages/NewGroup'
import GroupDetail from './pages/GroupDetail'
import AddExpense from './pages/AddExpense'
import Settle from './pages/Settle'
import Join from './pages/Join'

function Shell({ children }: { children: ReactNode }) {
  const { address, disconnect } = useWallet()
  const aliases = useAliases()
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
              className="flex flex-col items-end rounded-xl bg-white px-3 py-1 text-right ring-1 ring-ink-200 hover:bg-ink-100"
            >
              <span className="text-xs font-semibold text-ink-900">{aliases[address] ?? 'Mi cuenta'}</span>
              <KeyHint address={address} />
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
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<RequireWallet><NewGroup /></RequireWallet>} />
            <Route path="/g/:id" element={<RequireWallet><GroupDetail /></RequireWallet>} />
            <Route path="/g/:id/expense" element={<RequireWallet><AddExpense /></RequireWallet>} />
            <Route path="/g/:id/settle" element={<RequireWallet><Settle /></RequireWallet>} />
            {/* Invite links: /join/<groupId>#<code>. No wallet required to open it. */}
            <Route path="/join/:id" element={<Join />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </WalletProvider>
  )
}
