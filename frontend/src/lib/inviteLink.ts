/**
 * Invite link = `${origin}/join/<groupId>#<code>` (agreed format), optionally
 * followed by `&n=<name>,<name>` with the names still waiting to be claimed.
 * Everything after "#" stays in the browser and never reaches a server.
 */
export function withPendingNames(link: string, names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean)
  return clean.length ? `${link}&n=${clean.map(encodeURIComponent).join(',')}` : link
}

/** Parses the part after "#": the invite code and the pending names, if any. */
export function parseInviteHash(hash: string): { code: string; names: string[] } {
  const [code = '', ...rest] = hash.replace(/^#/, '').split('&')
  const n = rest.find((p) => p.startsWith('n='))
  const names = n
    ? n
        .slice(2)
        .split(',')
        .map((x) => {
          try {
            return decodeURIComponent(x).trim()
          } catch {
            return ''
          }
        })
        .filter(Boolean)
    : []
  return { code: code.trim(), names }
}
