import { useCallback, useEffect, useState } from 'react'
import { humanizeError } from './lib/errors'

/** Minimal data loader: { data, error, loading, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await load())
      setError(null)
    } catch (e) {
      console.error(e)
      setError(humanizeError(e))
    } finally {
      setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload }
}
