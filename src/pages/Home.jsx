import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Card, CapsuleTabs, NoticeBar, Empty, Grid, Image, ProgressBar, Rate, SearchBar, Skeleton, Tag } from 'antd-mobile'
import { EnvironmentOutline, FireFill, RightOutline } from 'antd-mobile-icons'
import { APP_WORDMARK } from '../config.js'
import { useNow, useQuery } from '../hooks/index.js'
import { api, kitchenById } from '../services/api.js'
import { PICKED, READY, STATUSES, isRejected, statusIndex, useAuth, useMyReviews, useOrders, usePins } from '../store/index.js'
import { clock, pickupPlace } from '../lib/format.js'
import { kitchenRating } from '../lib/ratings.js'
import { useNotify } from '../store/notify.js'
import { StoryRow, keepTouch } from './stories.jsx'
import { PinIcon } from './shared.jsx'
import { useMyBuyerKitchen, useMyStoryGroup } from '../lib/myKitchen.js'

export default function Home() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const orders = useOrders((s) => s.orders)
  const mine = useMyReviews((s) => s.reviews)
  const mockKitchens = useQuery('kitchens', api.listKitchens)
  const mockStories = useQuery('stories', api.listStories)
  // Your own kitchen (if you cook) shows up for buyers like any other.
  const myKitchen = useMyBuyerKitchen()
  const myStories = useMyStoryGroup(myKitchen)
  const pins = usePins((s) => s.pins)
  const togglePin = usePins((s) => s.toggle)
  // Pinned kitchens first (most recently pinned first), then your kitchen, then the rest.
  // A pilot cook's kitchen is already listed — your live version replaces that entry.
  const kitchens = useMemo(() => {
    if (!mockKitchens) return null
    const listed = myKitchen && mockKitchens.some((k) => k.id === myKitchen.id)
    const others = mockKitchens.filter((k) => k.id !== myKitchen?.id)
    const list = [...(myKitchen && (listed || myKitchen.hasDishes) ? [myKitchen] : []), ...others]
    const pinnedList = list.filter((k) => pins[k.id]).sort((a, b) => pins[b.id] - pins[a.id])
    return [...pinnedList, ...list.filter((k) => !pins[k.id])]
  }, [mockKitchens, myKitchen, pins])
  const pinnedCount = (kitchens ?? []).filter((k) => pins[k.id]).length
  const stories = useMemo(() => [...(myStories ? [myStories] : []), ...(mockStories ?? [])], [mockStories, myStories])
  const now = useNow(2000)
  const { subs, dismissed, dismiss } = useNotify()
  // "Notify me" alerts: dishes you asked about that are live now (and you haven't dismissed this time).
  const alerts = Object.entries(subs).flatMap(([key, sub]) => {
    const k = (kitchens ?? []).find((x) => x.id === sub.kitchenId)
    const item = k?.items.find((i) => i.id === sub.dishId && i.closesAt > now)
    const since = item?.liveSince ?? 'live'
    return item && dismissed[key] !== since ? [{ key, since, kitchen: k, item }] : []
  })
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const isLive = (k) => k.items.some((i) => i.closesAt > now)
  // Pre-order: ordering still open, food handed over later (not "available right now").
  const hasPreorder = (k) => k.items.some((i) => i.closesAt > now && !i.availableNow && i.readyAt > now)
  const active = orders.filter((o) => statusIndex(o, now) < PICKED && !isRejected(o))

  const shown = useMemo(() => (kitchens ?? []).filter((k) => {
    if (filter === 'live' && !isLive(k)) return false
    if (filter === 'preorder' && !hasPreorder(k)) return false
    if (filter === 'pinned' && pinnedCount && !pins[k.id]) return false
    if (!q) return true
    const s = q.toLowerCase()
    return k.name.toLowerCase().includes(s) || k.cuisine.toLowerCase().includes(s) || k.items.some((i) => i.name.toLowerCase().includes(s))
  }), [kitchens, filter, q, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveCount = (kitchens ?? []).filter(isLive).length

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="pad row between" style={{ paddingTop: 14 }}>
        <div className="row" style={{ gap: 6 }}>
          <img className="brand-logo" src="/logo.svg" alt="" width={34} height={34} />
          <span className="serif" style={{ fontSize: 26 }}>{APP_WORDMARK}</span>
        </div>
        <button className="avatar-btn" aria-label="Your profile" onClick={() => navigate('/settings')}>
          <Avatar src="" fallback={<span className="avatar-initials">{user.initials}</span>} style={{ '--size': '40px', '--border-radius': '50%', background: 'var(--ink)' }} />
        </button>
      </div>

      <div className="pad row muted" style={{ gap: 4, fontSize: 12, marginTop: 4 }}><EnvironmentOutline /> {user.society}{user.flat ? ` · ${user.flat}` : ''}</div>

      {alerts.map((a) => (
        <div key={a.key} className="pad" style={{ marginTop: 10 }}>
          <NoticeBar color="info" wrap closeable onClose={() => dismiss(a.key, a.since)}
            icon={<span className="bell-dot">🔔</span>}
            content={<span onClick={() => navigate(`/kitchen/${a.kitchen.id}`)}><b>{a.item.name}</b> is live at {a.kitchen.name} — <u>order now</u></span>} />
        </div>
      ))}

      {stories?.length > 0 && <StoryRow groups={stories} pins={pins} />}

      {active.length > 0 && (
        <div className="pad" style={{ marginTop: 16 }}>
          <div className="caps" style={{ marginBottom: 8 }}>Track your orders</div>
          <div className="stack" style={{ gap: 8 }}>
            {active.map((o) => {
              const k = kitchenById(o.kitchenId); const i = statusIndex(o, now)
              return (
                <Card key={o.id} className={`track-card ${i === READY ? 'ready' : ''}`} onClick={() => navigate(`/orders/${o.id}`)} style={{ background: 'var(--ink)', borderColor: 'var(--ink)' }}>
                  <div className="row between">
                    <div className="row" style={{ gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--turmeric)', display: 'grid', placeItems: 'center', fontSize: 20, color: 'var(--ink)' }}><FireFill /></div>
                      <div>
                        <div style={{ color: i === READY ? '#DCE5D5' : 'var(--turmeric)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em' }}>{i === READY ? 'READY FOR PICKUP — GO GET IT' : STATUSES[i].toUpperCase()}</div>
                        <div className="h3" style={{ color: 'var(--paper)' }}>{k.name}</div>
                        <div className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>#{o.id} · ready by {clock(o.lines[0].readyAt)}</div>
                      </div>
                    </div>
                    <RightOutline color="var(--paper)" />
                  </div>
                  <ProgressBar percent={((i + 1) / (STATUSES.length - 1)) * 100} style={{ marginTop: 12, '--track-color': i === READY ? 'rgba(255,255,255,.25)' : '#3a332c', '--fill-color': i === READY ? '#DCE5D5' : 'var(--turmeric)', '--track-width': '4px' }} />
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="pad" style={{ marginTop: 18 }}>
        <SearchBar placeholder="Search kitchens or dishes" value={q} onChange={setQ} style={{ '--background': 'var(--card)', '--border-radius': '12px', '--height': '42px' }} />
      </div>

      <div className="row between pad" style={{ marginTop: 18 }}>
        <h2 className="h2">Kitchens in your society</h2>
        <span className="mono faint">{shown.length}</span>
      </div>
      <div {...keepTouch}>
      <CapsuleTabs activeKey={filter === 'pinned' && !pinnedCount ? 'all' : filter} onChange={setFilter} className="home-filters">
        <CapsuleTabs.Tab title="All" key="all" />
        <CapsuleTabs.Tab title={`Live now · ${liveCount}`} key="live" />
        <CapsuleTabs.Tab title="Pre-order now" key="preorder" />
        {pinnedCount > 0 && <CapsuleTabs.Tab title={`Pinned · ${pinnedCount}`} key="pinned" />}
      </CapsuleTabs>
      </div>

      <div className="pad">
        {!kitchens ? (
          <Grid columns={2} gap={12}>{[0, 1, 2, 3].map((i) => <Grid.Item key={i}><Skeleton animated style={{ height: 200, borderRadius: 18 }} /></Grid.Item>)}</Grid>
        ) : shown.length === 0 ? (
          <Empty description="No kitchens match that." />
        ) : (
          <Grid columns={2} gap={12}>
            {shown.map((k) => {
              const live = k.items.filter((i) => i.closesAt > now).length
              return (
                <Grid.Item key={k.id}>
                  <Card className="kitchen-tile" onClick={() => navigate(`/kitchen/${k.id}`)} bodyStyle={{ padding: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <button className={`pin-btn tile ${pins[k.id] ? 'on' : ''}`} aria-pressed={!!pins[k.id]} aria-label={pins[k.id] ? 'Unpin kitchen' : 'Pin kitchen'}
                        onClick={(e) => { e.stopPropagation(); togglePin(k.id) }}>
                        <PinIcon on={!!pins[k.id]} size={15} />
                      </button>
                      <Image src={k.mine ? k.cover : k.thumb} fit="cover" height={120} style={{ opacity: live ? 1 : 0.7 }} />
                      {k.mine && <Tag round style={{ position: 'absolute', bottom: 8, left: 8, '--background-color': 'var(--ink)', '--text-color': 'var(--paper)', '--border-color': 'var(--ink)' }}>Your kitchen</Tag>}
                      <Tag round color={live ? 'primary' : 'default'} style={{ position: 'absolute', top: 8, left: 8, '--text-color': 'var(--ink)', ...(live ? {} : { background: 'var(--card)' }) }}>
                        {live ? `Live · ${live} item${live > 1 ? 's' : ''}` : k.nextOpen}
                      </Tag>
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <div className="h3" style={{ minHeight: 40 }}>{k.name}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{k.cuisine}</div>
                      {(() => { const rs = kitchenRating(k, mine); return rs.count ? (
                        <div className="row" style={{ gap: 4, marginTop: 6 }}>
                          <Rate readOnly allowHalf value={rs.avg} count={5} style={{ '--star-size': '11px', '--active-color': 'var(--turmeric)' }} />
                          <span className="mono" style={{ fontSize: 12 }}>{rs.avg.toFixed(1)}</span>
                        </div>
                      ) : <div className="row" style={{ marginTop: 6 }}><Tag round fill="outline" color="default" style={{ '--text-color': 'var(--ink-2)' }}>New</Tag></div> })()}
                      {pickupPlace(k) && <div className="mono faint" style={{ fontSize: 12, marginTop: 2 }}>{pickupPlace(k)}</div>}
                    </div>
                  </Card>
                </Grid.Item>
              )
            })}
          </Grid>
        )}
      </div>
    </div>
  )
}
