import { LANGS, setLang, t, useLang, type Lang } from '../i18n'

/** Minimal round flags: flat colours, no detail, same size as the text around them. */
function Flag({ lang }: { lang: Lang }) {
  const common = { width: 20, height: 20, viewBox: '0 0 20 20', 'aria-hidden': true } as const
  const clip = `flag-${lang}`
  return (
    <svg {...common} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {lang === 'es' && (
          <>
            <rect width="20" height="20" fill="#C60B1E" />
            <rect y="5" width="20" height="10" fill="#FFC400" />
          </>
        )}
        {lang === 'pt' && (
          <>
            <rect width="20" height="20" fill="#DA291C" />
            <rect width="8" height="20" fill="#046A38" />
            <circle cx="8" cy="10" r="3.2" fill="#FFE900" />
          </>
        )}
        {lang === 'en' && (
          <>
            <rect width="20" height="20" fill="#012169" />
            <path d="M0 0L20 20M20 0L0 20" stroke="#FFF" strokeWidth="4" />
            <path d="M0 0L20 20M20 0L0 20" stroke="#C8102E" strokeWidth="1.5" />
            <path d="M10 0V20M0 10H20" stroke="#FFF" strokeWidth="6" />
            <path d="M10 0V20M0 10H20" stroke="#C8102E" strokeWidth="3.5" />
          </>
        )}
      </g>
      <circle cx="10" cy="10" r="9.5" fill="none" stroke="rgba(21,19,46,0.12)" />
    </svg>
  )
}

const NAMES: Record<Lang, string> = { es: 'Español', en: 'English', pt: 'Português' }

export function LanguagePicker() {
  const current = useLang()
  return (
    <div role="group" aria-label={t('Idioma')} className="flex items-center gap-1">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={current === l}
          aria-label={NAMES[l]}
          title={NAMES[l]}
          className={`rounded-full p-0.5 transition ${
            current === l ? 'ring-2 ring-brand-600' : 'opacity-50 grayscale-[40%] hover:opacity-100 hover:grayscale-0'
          }`}
        >
          <Flag lang={l} />
        </button>
      ))}
    </div>
  )
}
