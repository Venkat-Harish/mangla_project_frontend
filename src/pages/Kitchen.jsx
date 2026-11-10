import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Dialog, Divider, Ellipsis, Empty, Form, Image, ImageViewer, NavBar, Popup, Rate, Skeleton, Stepper, Tabs, Tag, TextArea, Toast } from 'antd-mobile'
import { BellOutline, ClockCircleOutline, CloseOutline, EditSOutline, StarFill, EnvironmentOutline, FireFill, PlayOutline, RightOutline, SoundOutline } from 'antd-mobile-icons'
import { useNow, useQuery } from '../hooks/index.js'
import { api, kitchenById } from '../services/api.js'
import { useAuth, useCart, useMyReviews, usePins } from '../store/index.js'
import { useRequests } from '../store/requests.js'
import { clock, closing, dayLabel, rupees, timeAgo } from '../lib/format.js'
import { dishRating, kitchenRating } from '../lib/ratings.js'
import { useNotify } from '../store/notify.js'
import { society } from '../data/mock.js'
import { isMyKitchenId, useMyBuyerKitchen, useMyBuyerPosts } from '../lib/myKitchen.js'
import { MediaView, PinIcon } from './shared.jsx'

export default function Kitchen() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Your own kitchen comes live from cook-mode data; the rest from the api.
  const isMine = isMyKitchenId(id)
  const myKitchen = useMyBuyerKitchen()
  const myPosts = useMyBuyerPosts()
  const queried = useQuery('kitchen:' + id, () => api.getKitchen(id))
  const queriedPosts = useQuery('posts:' + id, () => api.listPosts(id))
  const kitchen = isMine ? myKitchen : queried
  const posts = isMine ? myPosts : queriedPosts
  const mine = useMyReviews((s) => s.reviews).filter((r) => r.kitchenId === id)
  const cart = useCart()
  const now = useNow(1000)
  const [tab, setTab] = useState('live')
  const [video, setVideo] = useState(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customForm] = Form.useForm()
  const createRequest = useRequests((s) => s.create)
  const user = useAuth((s) => s.user)
  const pinned = usePins((s) => !!s.pins[id])
  const togglePin = usePins((s) => s.toggle)
  const notifySubs = useNotify((s) => s.subs)
  const toggleNotify = useNotify((s) => s.toggle)

  if (kitchen === null) return <Empty description="Kitchen not found" />
  if (!kitchen) return <div className="pad" style={{ paddingTop: 24 }}><Skeleton animated style={{ height: 240, borderRadius: 18 }} /><Skeleton.Paragraph lineCount={5} animated /></div>

  const rating = kitchenRating(kitchen, mine)
  const offMenu = kitchen.offMenu ?? []
  const openReviews = (dish) => navigate(`/kitchen/${kitchen.id}/reviews${dish ? `?dish=${encodeURIComponent(dish)}` : ''}`)
  // Small boxed per-dish rating; tap → reviews filtered to this dish.
  const DishRating = ({ name }) => {
    const r = dishRating(kitchen, name, mine)
    return (
      <button className="dish-rating" onClick={(e) => { e.stopPropagation(); openReviews(name) }} aria-label={`Reviews for ${name}`}>
        {r.count ? <><StarFill /> {r.avg.toFixed(1)}</> : 'New'}
      </button>
    )
  }
  const items = [...kitchen.items].sort((a, b) => (a.closesAt < now) - (b.closesAt < now))
  const qtyOf = (itemId) => (cart.kitchenId === kitchen.id ? cart.qty[itemId] ?? 0 : 0)

  const setQty = async (item, n) => {
    if (n > 0 && cart.conflicts(kitchen.id)) {
      const other = kitchenById(cart.kitchenId)
      const ok = await Dialog.confirm({
        title: 'Start a new cart?',
        content: `Your cart has items from ${other.name}. Pickup happens at one kitchen, so adding from ${kitchen.name} will clear it.`,
        confirmText: 'Start new cart', cancelText: 'Keep current cart',
      })
      if (!ok) return
      cart.clear()
    }
    cart.setQty(kitchen.id, item.id, n)
  }

  const cartLines = cart.kitchenId === kitchen.id ? kitchen.items.filter((i) => cart.qty[i.id]) : []
  const cartCount = cartLines.reduce((s, i) => s + cart.qty[i.id], 0)
  const cartTotal = cartLines.reduce((s, i) => s + cart.qty[i.id] * i.price, 0)
  const liveCount = kitchen.items.filter((i) => i.closesAt > now).length

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Image src={kitchen.cover} fit="cover" height={250} />
        <NavBar onBack={() => navigate(-1)} className="nav-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          right={
            <button className={`pin-btn hero ${pinned ? 'on' : ''}`} aria-pressed={pinned} aria-label={pinned ? 'Unpin kitchen' : 'Pin kitchen'}
              onClick={() => { const on = togglePin(kitchen.id); Toast.show({ content: on ? `Pinned — ${kitchen.owner.split(' ')[0]}’s kitchen and stories now come first` : 'Unpinned' }) }}>
              <PinIcon on={pinned} size={18} />
            </button>
          } />
      </div>

      <div className="kitchen-sheet">
        <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
          <h1 className="h1">{kitchen.name}</h1>
          <button className="kitchen-rating" onClick={() => openReviews(null)} aria-label="Ratings and reviews">
            {rating.count ? <><StarFill /> <b>{rating.avg.toFixed(1)}</b> <span>· {rating.count}</span></> : <b>New</b>}
          </button>
        </div>
        <div className="italic muted" style={{ fontSize: 15, marginTop: 2 }}>by {kitchen.owner} · {kitchen.cuisine}</div>
        <div className="row muted" style={{ gap: 6, marginTop: 10, fontSize: 13 }}>
          <EnvironmentOutline /> <span>Block {kitchen.block} · Flat {kitchen.flat} · {society.name}</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 14 }}>{kitchen.about}</p>


        <Card style={{ marginTop: 10 }} onClick={() => setCustomOpen(true)}>
          <div className="custom-cta">
            <span className="icon"><EditSOutline /></span>
            <div style={{ flex: 1 }}>
              <b>Want something special?</b>
              <div className="muted" style={{ fontSize: 12 }}>Request a custom order — {kitchen.owner.split(' ')[0]} will reply with a price</div>
            </div>
            <RightOutline />
          </div>
        </Card>
      </div>

      <Popup visible={customOpen} onMaskClick={() => setCustomOpen(false)} showCloseButton onClose={() => setCustomOpen(false)}>
        <div style={{ padding: '20px 4px 24px' }}>
          <h2 className="h1 pad">Custom order</h2>
          <div className="pad muted" style={{ fontSize: 13, marginTop: 4 }}>Tell {kitchen.owner.split(' ')[0]} exactly what you’d like. You’ll chat here and get a price before paying.</div>
          <Form form={customForm} layout="vertical" requiredMarkStyle="none" initialValues={{ portions: 2 }}
            onFinish={(v) => {
              const rid = createRequest({ kitchenId: kitchen.id, buyer: { name: user.name, flat: user.flat, you: true }, text: v.text.trim(), portions: v.portions })
              setCustomOpen(false); customForm.resetFields()
              navigate(`/requests/${rid}`)
            }}
            footer={<Button block type="submit" color="primary" size="large">Send request</Button>}>
            <Form.Item name="text" label="What would you like?" rules={[{ required: true, message: 'Describe what you’d like' }, { min: 5, message: 'A little more detail, please' }]}>
              <TextArea placeholder="e.g. Coconut chutney and extra sambar with 8 idlis, less spicy" maxLength={300} showCount autoSize={{ minRows: 3, maxRows: 6 }} />
            </Form.Item>
            <Form.Item name="portions" label="Portions" childElementPosition="right">
              <Stepper min={1} max={50} />
            </Form.Item>
          </Form>
        </div>
      </Popup>

      <Tabs activeKey={tab} onChange={setTab} style={{ '--title-font-size': '15px', position: 'sticky', top: 0, zIndex: 4, background: 'var(--paper)' }}>
        <Tabs.Tab title={`Menu · ${liveCount} live`} key="live" />
        <Tabs.Tab title={`Posts (${posts?.length ?? 0})`} key="posts" />
      </Tabs>

      <div className="pad stack" style={{ paddingTop: 14, paddingBottom: 16 }}>
        {tab === 'live' && (items.length === 0 ? (
          offMenu.length
            ? <div className="muted" style={{ fontSize: 13 }}>Nothing on the stove right now. {kitchen.nextOpen ?? ''} — tap 🔔 on a dish and we’ll tell you when it’s live.</div>
            : <Empty description={`Nothing on the stove right now. ${kitchen.nextOpen ?? ''} — check Posts for what’s coming.`} />
        ) : items.map((item) => {
          const c = closing(item.closesAt, now)
          const q = qtyOf(item.id)
          const soldOut = item.left <= 0
          const closed = c.state === 'closed' || soldOut
          return (
            <Card key={item.id} style={{ opacity: closed ? 0.55 : 1 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div className="h2">{item.name}</div>
                  <Ellipsis className="muted" content={item.desc} rows={2} style={{ fontSize: 13, marginTop: 4 }} />
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="mono" style={{ fontWeight: 500, fontSize: 15 }}>{rupees(item.price)}</span>
                    <span className="mono faint" style={{ fontSize: 12 }}>· {item.left} of {item.total} left</span>
                    <DishRating name={item.name} />
                  </div>
                </div>
                <div style={{ width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }} onClick={() => item.gallery?.length > 1 && ImageViewer.Multi.show({ images: item.gallery })}>
                    <Image src={item.photo} width={92} height={92} fit="cover" style={{ borderRadius: 12 }} />
                    {item.gallery?.length > 1 && <span className="dish-count">1/{item.gallery.length}</span>}
                  </div>
                  <div style={{ marginTop: -16 }}>
                    {closed ? (
                      <Button size="mini" disabled shape="rounded">{soldOut ? 'Sold out' : 'Closed'}</Button>
                    ) : q === 0 ? (
                      <Button size="small" shape="rounded" color="primary" onClick={() => setQty(item, 1)}>Add</Button>
                    ) : (
                      <Stepper value={q} min={0} max={item.left} onChange={(v) => setQty(item, v)} style={{ '--button-background-color': 'var(--ink)', '--button-text-color': 'var(--paper)', '--input-background-color': 'var(--card)', '--height': '30px', '--input-width': '30px' }} />
                    )}
                  </div>
                </div>
              </div>
              <Divider style={{ borderStyle: 'dashed', margin: '12px 0 10px' }} />
              <div className="row between" style={{ flexWrap: 'wrap', rowGap: 6 }}>
                {item.availableNow ? (
                  <Tag round color="success"><span className="row" style={{ gap: 4 }}><FireFill /> Available now · ready to pick up</span></Tag>
                ) : (
                  <>
                    <Tag fill="outline" color="default" round style={{ '--text-color': 'var(--ink-2)' }}>
                      <span className="row" style={{ gap: 4 }}><FireFill /> {isMine ? 'Pre-order · ' : ''}Ready {dayLabel(item.readyAt, now).toLowerCase()} {clock(item.readyAt)}</span>
                    </Tag>
                    <Tag round color={c.state === 'soon' ? 'danger' : 'default'} fill={c.state === 'soon' ? 'solid' : 'outline'} style={c.state === 'soon' ? {} : { '--text-color': 'var(--ink-2)' }}>
                      <span className="row" style={{ gap: 4 }}><ClockCircleOutline /> {c.state === 'closed' ? 'Orders closed' : `Closes ${clock(item.closesAt)} · ${c.label}`}</span>
                    </Tag>
                  </>
                )}
              </div>
            </Card>
          )
        }))}

        {tab === 'live' && offMenu.length > 0 && (
          <>
            <div className="caps" style={{ marginTop: items.length ? 10 : 2 }}>Not available right now</div>
            {offMenu.map((d) => {
              const on = !!notifySubs[`${kitchen.id}|${d.id}`]
              return (
                <Card key={d.id} className="dish-off">
                  <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div className="h2">{d.name}</div>
                      <Ellipsis className="muted" content={d.desc} rows={2} style={{ fontSize: 13, marginTop: 4 }} />
                      <div className="row" style={{ marginTop: 8 }}>
                        <span className="mono" style={{ fontSize: 15 }}>{rupees(d.price)}</span>
                        <DishRating name={d.name} />
                      </div>
                    </div>
                    <div style={{ width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Image src={d.photo} width={92} height={92} fit="cover" className="dish-off-img" style={{ borderRadius: 12 }} />
                      <button className={`notify-btn ${on ? 'on' : ''}`} onClick={() => {
                        const nowOn = toggleNotify(kitchen.id, d)
                        Toast.show({ content: nowOn ? `We’ll tell you when ${d.name} is live` : 'Notifications off for this dish' })
                      }}>
                        <BellOutline /> {on ? 'Notifying' : 'Notify me'}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </>
        )}

        {tab === 'posts' && (!posts ? <Skeleton.Paragraph lineCount={6} animated /> : posts.map((p) => (
          <Card key={p.id} bodyStyle={{ padding: 0 }} style={p.type === 'headsup' ? { background: 'var(--turmeric-soft)', borderColor: 'var(--turmeric)' } : {}}>
            <div className="row" style={{ padding: '12px 14px', gap: 10 }}>
              <Image src={kitchen.thumb} width={32} height={32} fit="cover" style={{ borderRadius: 16 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{kitchen.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{p.type === 'video' ? 'Cooking video' : p.type === 'headsup' ? 'Heads-up' : 'Photo'} · {timeAgo(p.at, now)}</div>
              </div>
            </div>
            {p.mediaKey && <MediaView mediaKey={p.mediaKey} type={p.type === 'video' ? 'video' : 'image'} height={260} controls={p.type === 'video'} />}
            {p.type === 'video' && !p.mediaKey && (
              <div style={{ position: 'relative' }} onClick={() => setVideo(p)}>
                <Image src={p.poster} fit="cover" height={240} />
                <div className="play-badge"><PlayOutline fontSize={26} /></div>
                <Tag color="#1E1A16" round style={{ position: 'absolute', right: 10, bottom: 10 }}><span className="mono">{p.duration}</span></Tag>
              </div>
            )}
            {p.type === 'photo' && !p.mediaKey && <Image src={p.image} fit="cover" height={240} onClick={() => ImageViewer.show({ image: p.image })} />}
            <div style={{ padding: '12px 14px 14px' }}>
              {p.type === 'headsup' && (
                <>
                  <div className="row caps" style={{ gap: 6, color: 'var(--ink)' }}><SoundOutline /> Coming up</div>
                  <div className="h2" style={{ marginTop: 6 }}>{p.title}</div>
                </>
              )}
              <div className={p.type === 'headsup' ? 'muted' : ''} style={{ fontSize: 14, marginTop: p.type === 'headsup' ? 6 : 0 }}>{p.caption}</div>
              {p.type === 'headsup' && (
                <Button size="small" shape="rounded" style={{ marginTop: 12, '--background-color': 'var(--ink)', '--text-color': 'var(--paper)', '--border-color': 'var(--ink)' }}
                  onClick={() => Toast.show({ content: 'We’ll remind you when pre-orders open' })}>Remind me</Button>
              )}
            </div>
          </Card>
        )))}
      </div>

      {cartCount > 0 && (
        <div className="sticky-bottom">
          <Button block size="large" onClick={() => navigate('/cart')} style={{ '--background-color': 'var(--ink)', '--text-color': 'var(--paper)', '--border-color': 'var(--ink)' }}>
            <span className="row between" style={{ width: '100%' }}>
              <span className="mono">{cartCount} item{cartCount > 1 ? 's' : ''} · {rupees(cartTotal)}</span>
              <span className="row" style={{ color: 'var(--turmeric)', gap: 4 }}>View cart <RightOutline /></span>
            </span>
          </Button>
        </div>
      )}

      <Popup visible={!!video} onMaskClick={() => setVideo(null)} destroyOnClose bodyStyle={{ height: '100dvh', background: '#000', borderRadius: 0 }}>
        {video && (
          <div style={{ position: 'relative', height: '100%' }}>
            {video.src
              ? <video src={video.src} poster={video.poster} autoPlay playsInline controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Image src={video.poster} fit="cover" width="100%" height="100%" />}
            <div className="story-progress"><span /></div>
            <div className="row" style={{ position: 'absolute', top: 'calc(18px + env(safe-area-inset-top, 0px))', left: 14, right: 14, gap: 10, color: '#fff' }}>
              <Image src={kitchen.thumb} width={32} height={32} fit="cover" style={{ borderRadius: 16 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{kitchen.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{timeAgo(video.at, now)}</div>
              </div>
              <CloseOutline fontSize={24} onClick={() => setVideo(null)} />
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 18px calc(28px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(transparent, rgba(0,0,0,.75))', color: '#fff' }}>
              <div style={{ fontSize: 15 }}>{video.caption}</div>
              {!video.src && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Video plays here once kitchens can upload clips.</div>}
              {liveCount > 0 && (
                <Button size="middle" color="primary" shape="rounded" style={{ marginTop: 14 }} onClick={() => { setVideo(null); setTab('live') }}>
                  See live orders
                </Button>
              )}
            </div>
          </div>
        )}
      </Popup>
    </div>
  )
}
