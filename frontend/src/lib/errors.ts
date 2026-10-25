/** Error codes from the contract's `#[contracterror] enum Error`. */
export const ContractError = {
  GroupNotFound: 1,
  NotAMember: 2,
  InvalidAmount: 3,
  NoParticipants: 4,
  EmptyGroup: 5,
  DuplicateMember: 6,
  NothingToSettle: 7,
  AmountTooLarge: 8,
  SelfSettlement: 9,
  AlreadyMember: 10,
  InvalidInvite: 11,
  NoInvite: 12,
} as const

const MESSAGES: Record<number, string> = {
  1: 'Ese grupo no existe.',
  2: 'Alguna de las direcciones no es miembro del grupo.',
  3: 'El importe tiene que ser mayor que 0.',
  4: 'Elige al menos una persona con quien repartir.',
  5: 'El grupo necesita al menos un miembro.',
  6: 'Hay una dirección repetida entre los miembros.',
  7: 'No hay deuda pendiente entre esas dos personas.',
  8: 'El importe es mayor que lo que se debe.',
  9: 'No puedes pagarte a ti mismo.',
  10: 'Ya eres miembro de este grupo.',
  11: 'El enlace de invitación no es válido o ya ha caducado.',
  12: 'Este grupo todavía no tiene ninguna invitación activa.',
}

export class LumenSplitError extends Error {
  readonly code?: number
  constructor(message: string, code?: number) {
    super(message)
    this.name = 'LumenSplitError'
    this.code = code
  }
}

export function contractError(code: number): LumenSplitError {
  return new LumenSplitError(MESSAGES[code] ?? `Error del contrato #${code}`, code)
}

/**
 * Turns anything thrown by Freighter / the SDK / the contract into a sentence
 * a user can read. Soroban errors show up as "Error(Contract, #7)".
 */
export function humanizeError(e: unknown): string {
  if (e instanceof LumenSplitError) return e.message
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
  const m = raw.match(/Error\(Contract, #(\d+)\)/)
  if (m) return MESSAGES[Number(m[1])] ?? raw
  if (/user declined|rejected|denied/i.test(raw)) return 'Has cancelado la firma en Freighter.'
  if (/not installed|freighter.*not.*(found|available)/i.test(raw))
    return 'No encontramos Freighter. Instala la extensión y recarga la página.'
  if (/account not found|accountnotfound|Account .* not found/i.test(raw))
    return 'Tu cuenta aún no existe en testnet. Fóndeala gratis con Friendbot y vuelve a intentarlo.'
  if (/underfunded|insufficient|balance/i.test(raw))
    return 'No tienes saldo suficiente en la cuenta para este pago.'
  if (/network|fetch|timeout/i.test(raw)) return 'Problema de conexión con la red Stellar. Inténtalo de nuevo.'
  return raw || 'Algo ha fallado. Inténtalo de nuevo.'
}
