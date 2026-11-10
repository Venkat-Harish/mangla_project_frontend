import { CLOSING_SOON_MIN } from '../config.js'

export const rupees = (n) => '₹' + n.toLocaleString('en-IN')

export const clock = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()

export function dayLabel(t, now = Date.now()) {
  const d = new Date(t); const today = new Date(now)
  const diff = Math.round((new Date(d.toDateString()) - new Date(today.toDateString())) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const dateTime = (t) => `${new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${clock(t)}`

export function timeAgo(t, now = Date.now()) {
  const m = Math.round((now - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

// "1h 12m left" / "18 min left" / "Closed"
export function closing(closesAt, now = Date.now()) {
  const mins = Math.floor((closesAt - now) / 60000)
  if (mins < 0) return { label: 'Orders closed', state: 'closed' }
  const h = Math.floor(mins / 60); const m = mins % 60
  const label = h ? `${h}h ${m}m left` : `${m} min left`
  return { label, state: mins < CLOSING_SOON_MIN ? 'soon' : 'open' }
}

export const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// Shrink an uploaded photo so it fits comfortably in localStorage.
export function shrinkImage(file, max = 720) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.72))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
