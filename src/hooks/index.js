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
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  const install = async () => {
    if (!promptEvent) return false
    promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); return true
  }
  return { canPrompt: !!promptEvent, install, isIOS, standalone }
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
