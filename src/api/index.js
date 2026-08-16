const TIMEOUT = 10000

export async function apiFetch(path) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch('/api' + path, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch {
    return null
  }
}