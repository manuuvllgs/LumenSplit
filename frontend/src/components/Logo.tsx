/** The coin split in two with a ray of light between the halves: ink half follows the mode, gold half is HackMeridian's. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <path d="M29 6.2A26 26 0 0 0 29 57.8Z" style={{ fill: 'var(--logo-ink, var(--ink))' }} />
      <path d="M35 6.2A26 26 0 0 1 35 57.8Z" style={{ fill: 'var(--gold)' }} />
      <rect x="31" y="2" width="2" height="60" rx="1" style={{ fill: 'var(--gold)' }} opacity="0.6" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display font-bold tracking-tight ${className}`}>LumenSplit</span>
}
