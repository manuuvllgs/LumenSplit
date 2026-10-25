import type { ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { isMock } from './lib/lumensplit'
import { useNames } from './lib/aliases'
import { Icon, KeyHint } from './components/ui'
import { useWallet, WalletProvider } from './wallet'
import Home from './pages/Home'
import NewGroup from './pages/NewGroup'
import GroupDetail from './pages/GroupDetail'
import AddExpense from './pages/AddExpense'
import Settle from './pages/Settle'
import Join from './pages/Join'
import Faq from './pages/Faq'
import { NameGate } from './components/NameSetup'
import { LanguagePicker } from './components/LanguagePicker'
import { Footer } from './components/Footer'
import { LogoMark, Wordmark } from './components/Logo'
import { setMode, useMode } from './mode'
import { t, useLang } from './i18n'
import { NidoSessionBanner } from './components/NidoSession'

function ModeToggle() {
  const mode = useMode()
  const next = mode === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? t('Modo oscuro') : t('Modo claro')
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center text-ink-700 hover:bg-ink-100 hover:text-ink-900"
    >
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
    </button>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { address, disconnect } = useWallet()
  const aliases = useNames([address])
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50/90 backdrop-blur supports-[backdrop-filter]:bg-ink-50/75">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-ink-900" aria-label={t('Ir al inicio')}>
            <LogoMark className="h-8 w-8 shrink-0" />
            <Wordmark className="hidden text-lg min-[380px]:inline" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <LanguagePicker />
            </div>
            {isMock && <span className="bg-accent-400 px-2 py-0.5 font-control text-[11px] font-semibold text-on-accent">DEMO</span>}
            <ModeToggle />
            {address && (
              <button
                onClick={disconnect}
                title={t('Desconectar')}
                className="flex min-h-11 max-w-[9.5rem] flex-col items-end justify-center border border-ink-200 bg-surface px-3 py-1 text-right hover:border-ink-900 sm:max-w-none"
              >
                <span className="max-w-full truncate text-xs font-semibold text-ink-900">{aliases[address] ?? t('Mi cuenta')}</span>
                <KeyHint address={address} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:px-8">
        <NidoSessionBanner />
        <NameGate>{children}</NameGate>
      </main>
      <Footer />
    </div>
  )
}

/** Every page except Home needs a connected wallet. */
function RequireWallet({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  return address ? children : <Navigate to="/" replace />
}

export default function App() {
  // Re-mount everything below on a language change so every t() re-runs.
  const lang = useLang()
  return (
    <WalletProvider>
      <BrowserRouter key={lang}>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<RequireWallet><NewGroup /></RequireWallet>} />
            <Route path="/g/:id" element={<RequireWallet><GroupDetail /></RequireWallet>} />
            <Route path="/g/:id/expense" element={<RequireWallet><AddExpense /></RequireWallet>} />
            <Route path="/g/:id/settle" element={<RequireWallet><Settle /></RequireWallet>} />
            {/* Invite links: /join/<groupId>#<code>. No wallet required to open it. */}
            <Route path="/join/:id" element={<Join />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </WalletProvider>
  )
}
