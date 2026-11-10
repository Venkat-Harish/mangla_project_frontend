// Cook-mode building blocks, composed from antd-mobile parts.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Popup, Tag, TextArea, Toast } from 'antd-mobile'
import { ClockCircleOutline } from 'antd-mobile-icons'
import { useNow } from '../../hooks/index.js'
import SlideToConfirm from '../SlideToConfirm.jsx'
import { useAuth, useMyKitchen } from '../../store/index.js'
import { coverOf, useCook } from '../../store/cook.js'
import { useRequests } from '../../store/requests.js'
import { clock, dayLabel } from '../../lib/format.js'
import { prepareMedia, saveMedia } from '../../lib/media.js'
export { MediaView } from '../shared.jsx'

export function CookHeader({ title, extra, back }) {
  const navigate = useNavigate()
  const kitchen = useMyKitchen((s) => s.kitchen)
  const user = useAuth((s) => s.user)
  return (
    <div className="pad" style={{ paddingTop: 14 }}>
      <div className="row between">
        <div className="row" style={{ gap: 10 }}>
          <Avatar src={kitchen.logo} style={{ '--size': '38px', '--border-radius': '50%' }} />
          <div>
            <div className="h3">{kitchen.name}</div>
            <Tag round color="primary" style={{ '--text-color': 'var(--ink)', fontSize: 10 }}>COOK MODE</Tag>
          </div>
        </div>
        <button className="avatar-btn" aria-label="Your profile" onClick={() => navigate('/settings')}>
          <Avatar src="" fallback={<span className="avatar-initials">{user.initials}</span>} style={{ '--size': '40px', '--border-radius': '50%' }} />
        </button>
      </div>
      <div className="row between" style={{ marginTop: 18 }}>
        <h1 className="h1">{title}</h1>
        {extra}
      </div>
      {back}
    </div>
  )
}

// Availability of a dish: 'off' | 'now' | 'preorder', with a readable label.
export function availability(dish, now = Date.now()) {
  if (!dish.live) return { kind: 'off', label: 'Not live' }
  if (dish.live.now) return { kind: 'now', label: 'Available now' }
  const closeDay = dayLabel(dish.live.closesAt, now) === 'Today' ? '' : dayLabel(dish.live.closesAt, now).toLowerCase() + ' '
  const pickDay = dayLabel(dish.live.readyAt, now) === 'Today' ? '' : dayLabel(dish.live.readyAt, now).toLowerCase() + ' '
  if (dish.live.closesAt <= now) return { kind: 'preorder', label: `Pre-order closed · pickup ${pickDay}${clock(dish.live.readyAt)}` }
  return { kind: 'preorder', label: `Pre-order · closes ${closeDay}${clock(dish.live.closesAt)} · pickup ${pickDay}${clock(dish.live.readyAt)}` }
}

// "Ready to hand over": one soft slider per dish (and per paid custom request) with orders waiting.
// Pre-orders unlock once ordering closes; available-now dishes and custom orders straight away.
export function ReadyStrip() {
  const { dishes, incoming, markReady } = useCook()
  const kitchenId = useMyKitchen((s) => s.kitchen?.id)
  const requests = useRequests((s) => s.requests)
  const markRequestReady = useRequests((s) => s.markReady)
  const now = useNow(15000)
  const rows = dishes.filter((d) => d.live).map((d) => {
    const waiting = incoming.filter((o) => o.dishId === d.id && o.status === 'accepted')
    return { key: d.id, kind: 'dish', d, name: d.name, thumb: coverOf(d), buyers: waiting.length, portions: waiting.reduce((n, o) => n + o.qty, 0), unlocked: d.live.now || d.live.closesAt <= now }
  }).filter((r) => r.buyers > 0)
  const custom = requests.filter((r) => r.kitchenId === kitchenId && r.status === 'paid')
    .map((r) => ({ key: r.id, kind: 'request', r, name: `Custom · ${r.buyer.name.split(' ')[0]}`, buyers: 1, portions: r.portions, unlocked: true }))
  const all = [...rows, ...custom]
  if (!all.length) return null

  const confirm = () => new Promise((res) => setTimeout(res, 350))   // knob settles at the end
  const notify = (row) => {
    if (row.kind === 'dish') {
      const n = markReady(row.d.id)
      Toast.show({ icon: 'success', content: `${n} neighbour${n === 1 ? '' : 's'} notified — ${row.name} is ready` })
    } else {
      markRequestReady(row.r.id)
      Toast.show({ icon: 'success', content: `${row.r.buyer.name} notified — custom order ready` })
    }
  }

  return (
    <div className="ready-strip">
      <div className="caps" style={{ marginBottom: 12 }}>Ready to hand over?</div>
      {all.map((row) => row.unlocked ? (
        <div key={row.key} className="ready-row">
          <div className="ready-head">
            {row.thumb ? <img className="ready-thumb" src={row.thumb} alt="" /> : <div className="ready-thumb initials">{row.kind === 'request' ? row.r.buyer.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '·'}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</div>
              <div className="ready-meta">{row.buyers} neighbour{row.buyers === 1 ? '' : 's'} waiting · {row.portions} portion{row.portions === 1 ? '' : 's'}</div>
            </div>
          </div>
          <SlideToConfirm variant="soft" size="compact" label="Slide when ready"
            releaseLabel={`Release to notify ${row.buyers === 1 ? '1 neighbour' : `${row.buyers} neighbours`}`}
            doneLabel={`${row.buyers === 1 ? '1 neighbour' : `${row.buyers} neighbours`} notified`} onConfirm={confirm} onDone={() => notify(row)} />
        </div>
      ) : (
        <div key={row.key} className="ready-locked"><ClockCircleOutline /> {row.name} · {row.buyers} waiting · unlocks when orders close at {clock(row.d.live.closesAt)}</div>
      ))}
    </div>
  )
}

// Preview + text + share, for a freshly picked photo/video.
export function Composer({ file, kind, onClose }) {
  const { addPost, addStory } = useCook()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])
  useEffect(() => { if (file) setText('') }, [file])
  const isVideo = file?.type.startsWith('video/')

  const share = async () => {
    setBusy(true)
    try {
      const mediaKey = await saveMedia(await prepareMedia(file))
      const item = { type: isVideo ? 'video' : 'image', mediaKey, text: text.trim() }
      if (kind === 'story') addStory(item); else addPost(item)
      Toast.show({ icon: 'success', content: kind === 'story' ? 'Story shared' : 'Posted' })
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Popup visible={!!file} onMaskClick={onClose} showCloseButton onClose={onClose} destroyOnClose bodyStyle={{ maxHeight: '96dvh', overflowY: 'auto' }}>
      {file && (
        <div style={{ padding: '20px 16px 28px' }} className="stack">
          <h2 className="h1">{kind === 'story' ? 'New story' : 'New post'}</h2>
          <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000' }}>
            {isVideo ? <video src={url} controls playsInline style={{ width: '100%', maxHeight: '50dvh', display: 'block' }} />
              : <img src={url} alt="" style={{ width: '100%', maxHeight: '50dvh', objectFit: 'contain', display: 'block' }} />}
          </div>
          <TextArea placeholder={kind === 'story' ? 'Text on your story (optional)' : 'Add text… e.g. “Rajma going in, 6 portions left”'}
            value={text} onChange={setText} maxLength={kind === 'story' ? 120 : 400} showCount autoSize={{ minRows: 2, maxRows: 5 }}
            style={{ background: 'var(--card)', padding: 10, borderRadius: 12, border: '1px solid var(--line)' }} />
          <Button block size="large" color="primary" loading={busy} onClick={share}>{kind === 'story' ? 'Share story' : 'Post'}</Button>
        </div>
      )}
    </Popup>
  )
}
