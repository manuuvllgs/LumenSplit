import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { LanguagePicker } from './LanguagePicker'
import { LogoMark, Wordmark } from './Logo'

const AUTHORS = ['Manuel Villegas', 'Gregorio Torres', 'Alejandro Teva']

/**
 * The Dusk slate band: wordmark and pitch, authors, the hackathon, then the
 * small print. One column on phones, three from md up.
 */
export function Footer() {
  const year = 2026
  return (
    <footer className="bg-shade text-on-shade" style={{ ['--logo-ink' as string]: 'var(--on-shade)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark className="h-9 w-9" />
              <Wordmark className="text-xl md:text-2xl" />
            </div>
            <p className="mt-3 max-w-sm text-sm text-on-shade-muted">
              {t('Divide gastos con amigos.')} {t('Salda cuentas en segundos.')}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-on-shade">{t('Autores')}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-on-shade-muted">
              {AUTHORS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="border-l-4 border-accent-400 pl-3 text-sm font-semibold text-on-shade">
              {t('Hecho en HackMeridian Lisboa 2026')}
            </p>
            <div>
              <h2 className="sr-only">{t('Idioma')}</h2>
              <LanguagePicker />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-shade-rule pt-5 text-xs text-on-shade-muted md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li>
              <Link to="/faq" className="font-semibold text-on-shade underline underline-offset-2">
                {t('Preguntas frecuentes')}
              </Link>
            </li>
            <li>{t('Sin cookies ni rastreo')}</li>
            <li className="key">Stellar testnet</li>
          </ul>
          <p>
            © {year} LumenSplit. {t('Código abierto bajo licencia MIT')}
          </p>
        </div>
      </div>
    </footer>
  )
}
