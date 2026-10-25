/**
 * App mark (option B): a coin split in two by a ray of light, ink on a
 * HackMeridian-gold tile. Fixed colours, so it reads the same in light and dark.
 */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="116" fill="#fdda24" />
      <g transform="translate(256 256) scale(0.92) translate(-256 -256)">
        <path d="M240 106 A150 150 0 0 0 240 406 Z" fill="#0f0f0f" />
        <path d="M272 106 A150 150 0 0 1 272 406 Z" fill="#0f0f0f" opacity=".18" />
        <path d="M272 106 A150 150 0 0 1 272 406" fill="none" stroke="#0f0f0f" strokeWidth="18" />
        <rect x="249" y="70" width="14" height="372" rx="7" fill="#0f0f0f" />
      </g>
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display font-bold tracking-tight ${className}`}>LumenSplit</span>
}
