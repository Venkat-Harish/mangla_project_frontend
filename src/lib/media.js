// Photos and videos a cook posts are stored on the phone in IndexedDB (via idb-keyval),
// because videos are far too big for localStorage. Stores only keep the key.
import { useEffect, useState } from 'react'
import { clear, createStore, del, get, set } from 'idb-keyval'

const store = createStore('handi-media', 'files')

export async function saveMedia(blob) {
  const key = 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  await set(key, blob, store)
  return key
}
export const deleteMedia = (key) => del(key, store)
export const clearMedia = () => clear(store)

// One-off object URL for a stored file (caller may revoke it).
export async function getMediaUrl(key) {
  const b = key ? await get(key, store) : null
  return b ? URL.createObjectURL(b) : null
}

// Object URL for a stored file; revoked automatically.
export function useMediaUrl(key) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let u = null; let live = true
    if (key) get(key, store).then((b) => { if (b && live) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [key])
  return url
}

// Opens the camera (capture) or the gallery / file picker.
// Resolves with a File (or File[] when `multiple`), or null if cancelled.
export function pickMedia({ capture = false, accept = 'image/*,video/*', multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = accept; input.multiple = multiple && !capture
    if (capture) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    input.onchange = () => { const files = [...(input.files ?? [])]; resolve(multiple ? (files.length ? files : null) : files[0] ?? null); input.remove() }
    input.oncancel = () => { resolve(null); input.remove() }
    document.body.appendChild(input)
    input.click()
  })
}

// Downscale photos before storing; videos are kept as they are.
export function prepareMedia(file, max = 1280) {
  if (!file.type.startsWith('image/')) return Promise.resolve(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      c.toBlob((b) => resolve(b), 'image/jpeg', 0.8)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
