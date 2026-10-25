import { Link } from 'react-router-dom'
import { t } from '../i18n'

const AUTHORS = ['Manuel Villegas', 'Gregorio Torres', 'Alejandro Teva']

/**
 * Full-width footer band. On phones it stacks; from `md` up it spreads into
 * columns: brand and pitch, authors, hackathon badge. Links and copyright below.
 */
export function Footer() {
  const year = 2026
  return (
    <footer className="relative overflow-hidden rounded-t-3xl bg-ink-900 text-white md:rounded-t-[2.5rem]">
      {/* Soft brand glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-5%] h-64 w-64 rounded-full bg-brand-600 opacity-40 blur-3xl md:h-96 md:w-96"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-[-5%] h-56 w-56 rounded-full bg-accent-400 opacity-20 blur-3xl md:h-80 md:w-80"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_auto] md:items-start md:gap-12">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo-mark.svg" alt="" className="h-8 w-8 md:h-10 md:w-10" />
              <span className="font-display text-xl font-bold tracking-tight md:text-2xl">LumenSplit</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/60">{t('Divide gastos con amigos.')} {t('Salda cuentas en segundos.')}</p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{t('Autores')}</div>
            <ul className="mt-3 flex flex-wrap gap-1.5 md:flex-col md:items-start md:gap-2">
              {AUTHORS.map((a) => (
                <li key={a} className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/15">
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="inline-flex items-center gap-2 justify-self-start rounded-full bg-linear-to-r from-brand-600 to-brand-800 px-4 py-2 text-xs font-semibold shadow-sm md:text-sm">
            <span aria-hidden className="text-accent-400">✦</span>
            Made in HackMeridian Lisbon 2026
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to="/faq" className="font-semibold text-white/80 hover:text-white">
              FAQ
            </Link>
            <span aria-hidden>·</span>
            <span>{t('Sin cookies ni rastreo')}</span>
            <span aria-hidden>·</span>
            <span>Stellar testnet</span>
          </div>
          <div className="text-white/40">
            © {year} LumenSplit · {t('Código abierto bajo licencia MIT')}
          </div>
        </div>
      </div>
    </footer>
  )
}
