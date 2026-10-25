// Minimal stand-ins for the two @creit.tech/stellar-wallets-kit types the Nido
// module implements, so we can use the module directly without the whole kit.
export const ModuleType = { HOT_WALLET: 'HOT_WALLET' } as const
export type ModuleType = (typeof ModuleType)[keyof typeof ModuleType]
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleInterface {}
