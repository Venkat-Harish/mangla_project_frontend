import { useEffect, useState } from 'react'

// Re-render every `ms` so countdowns and order status stay live.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

// Load data from the async api with a small cache so revisits are instant.
const cache = new Map()
export function useQuery(key, fn) {
  const [data, setData] = useState(() => cache.get(key))
  useEffect(() => {
    let live = true
    fn().then((d) => { cache.set(key, d); if (live) setData(d) })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return data
}

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
