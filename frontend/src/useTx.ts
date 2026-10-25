import { useCallback, useState } from 'react'
import { humanizeError } from './lib/errors'
import type { TxOptions, TxResult } from './lib/lumensplit'

export type TxState =
  | { status: 'idle' }
  | { status: 'signing' }
  | { status: 'submitting' }
  | { status: 'done'; hash: string }
  | { status: 'error'; message: string }

/** Wraps a write call and tracks signing → submitting → done/error for the UI. */
export function useTx() {
  const [state, setState] = useState<TxState>({ status: 'idle' })

  const run = useCallback(async <T extends TxResult>(fn: (opts: TxOptions) => Promise<T>): Promise<T | null> => {
    setState({ status: 'signing' })
    try {
      const res = await fn({ onPhase: (p) => setState({ status: p }) })
      setState({ status: 'done', hash: res.hash })
      return res
    } catch (e) {
      console.error(e)
      setState({ status: 'error', message: humanizeError(e) })
      return null
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])
  const busy = state.status === 'signing' || state.status === 'submitting'
  return { state, run, reset, busy }
}
