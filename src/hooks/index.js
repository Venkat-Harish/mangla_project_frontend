import { useCallback, useEffect, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import { errorText } from '../services/http.js'

// Re-render every `ms` so countdowns and order status stay live.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

// Load data from the async api with a small cache so revisits are instant (the cached value shows
// while a fresh copy loads). Returns { data, error, reload }. A failure shows a Toast once and keeps
// the last good data. `refreshMs` reloads on a timer; `enabled: false` (or a null key) skips loading.
const cache = new Map()
const reloaders = new Map() // key -> Set of reload functions of mounted hooks

// After a write: forget cached copies whose key starts with `prefix` (so a page opened later
// doesn't flash stale data) and reload the mounted queries for them.
export function invalidate(prefix) {
  ;[...cache.keys()].forEach((key) => { if (key.startsWith(prefix)) cache.delete(key) })
  reloaders.forEach((fns, key) => { if (key.startsWith(prefix)) fns.forEach((fn) => fn()) })
}
export const clearQueryCache = () => cache.clear()
export const cachedQuery = (key) => cache.get(key)

// Several mounted pages can ask for the same key at once (the EAT swiper keeps Orders, Home and
// Cart mounted together); they share one request.
const inflight = new Map()
function fetchOnce(key, fn) {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)))
  return inflight.get(key)
}

export function useQueryState(key, fn, { refreshMs = 0, enabled = true } = {}) {
  const [state, setState] = useState({ key, data: cache.get(key), error: null })
  const current = state.key === key ? state : { key, data: cache.get(key), error: null }
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const fnRef = useRef(fn)
  fnRef.current = fn
  const failed = useRef(false)
  const active = enabled && key != null

  useEffect(() => {
    if (!active) return undefined
    let live = true
    fetchOnce(key, () => fnRef.current())
      .then((data) => { cache.set(key, data); failed.current = false; if (live) setState({ key, data, error: null }) })
      .catch((error) => {
        if (!live) return
        if (!failed.current) Toast.show({ icon: 'fail', content: errorText(error) })
        failed.current = true
        setState({ key, data: cache.get(key), error })
      })
    return () => { live = false }
  }, [key, tick, active])

  useEffect(() => {
    if (!active) return undefined
    if (!reloaders.has(key)) reloaders.set(key, new Set())
    const fns = reloaders.get(key)
    fns.add(reload)
    return () => { fns.delete(reload); if (!fns.size) reloaders.delete(key) }
  }, [key, reload, active])

  useEffect(() => {
    if (!active || !refreshMs) return undefined
    const t = setInterval(reload, refreshMs)
    return () => clearInterval(t)
  }, [refreshMs, reload, active])

  return { data: current.data, error: current.error, reload }
}

export const useQuery = (key, fn) => useQueryState(key, fn).data

// Android/desktop Chrome: capture the native install prompt. iOS: no prompt, show steps instead.
// Chrome fires `beforeinstallprompt` once, right after page load — usually before the user
// reaches Settings — so we catch it at module load (imported from main.jsx) and keep it here.
let deferredPrompt = null
const installListeners = new Set()
const notifyInstall = () => installListeners.forEach((fn) => fn(deferredPrompt))
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; notifyInstall() })
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notifyInstall() })
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(deferredPrompt)
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  useEffect(() => {
    setPromptEvent(deferredPrompt)
    installListeners.add(setPromptEvent)
    return () => { installListeners.delete(setPromptEvent) }
  }, [])
  const install = async () => {
    const evt = deferredPrompt
    if (!evt) return false
    evt.prompt()
    const choice = await evt.userChoice
    deferredPrompt = null; notifyInstall()
    return choice?.outcome === 'accepted'
  }
  return { canPrompt: !!promptEvent, install, isIOS, isAndroid, standalone }
}

// Applies Light / Dark / System to <html> (our tokens + antd-mobile's own dark flag + status bar colour).
const THEME_BG = { light: '#F5EFE4', dark: '#16130F' }
export function useTheme(pref) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref
      const root = document.documentElement
      root.dataset.theme = resolved
      root.setAttribute('data-prefers-color-scheme', resolved)
      root.style.colorScheme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[resolved])
    }
    apply()
    if (pref !== 'system') return undefined
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}
