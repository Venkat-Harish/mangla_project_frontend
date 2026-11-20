import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Empty, Image, ImageUploader, NavBar, Rate, Skeleton, Switch, TextArea, Toast } from 'antd-mobile'
import { invalidate } from '../hooks/index.js'
import { api, canReview } from '../services/api.js'
import { errorText } from '../services/http.js'
import { kitchenById } from '../store/catalog.js'
import { useAuth, useMyReviews, useOrders } from '../store/index.js'
import { shrinkImage } from '../lib/format.js'
import { ordersKey, useApiOrders } from '../lib/data.js'

const LABELS = ['', 'Not for me', 'Could be better', 'Good', 'Really good', 'Loved it']
const label = (v) => (!v ? '' : v % 1 ? `${LABELS[Math.ceil(v)]} · ${v}` : LABELS[v])

export default function RateOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const local = useOrders((s) => s.orders.find((o) => o.id === id))
  const { data: apiOrders } = useApiOrders()
  const order = local ?? apiOrders?.find((o) => o.id === id)
  const markRated = useOrders((s) => s.markRated)
  const addReviews = useMyReviews((s) => s.add)
  const user = useAuth((s) => s.user)
  const [stars, setStars] = useState({})
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState([])
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!order) {
    return <><NavBar onBack={() => navigate(-1)}>Rate your food</NavBar>{apiOrders === undefined
      ? <div className="pad"><Skeleton.Paragraph lineCount={6} animated /></div>
      : <Empty description="Order not found" />}</>
  }
  const fromApi = order.source === 'api'
  if (fromApi && !canReview(order)) {
    return (
      <><NavBar onBack={() => navigate(-1)}>Rate your food</NavBar>
        <Empty description={order.reviewId ? 'You’ve already reviewed this order.' : 'You can rate this order once it’s been delivered.'} />
        <div className="pad"><Button block onClick={() => navigate(`/orders/${order.id}`, { replace: true })}>Back to the order</Button></div></>
    )
  }
  const k = kitchenById(order.kitchenId)
  const kName = k?.name ?? order.kitchenName ?? 'Kitchen'
  const ready = order.lines.every((l) => stars[l.itemId])

  // Demo orders (checkout on this phone) keep their reviews on this phone.
  const submitLocal = () => {
    const createdAt = Date.now()
    addReviews(order.lines.map((l, n) => ({
      id: `${order.id}-${l.itemId}`, kitchenId: order.kitchenId, orderId: order.id, itemName: l.name,
      ...(anonymous
        ? { anonymous: true, userName: 'Anonymous neighbour' }
        : { userName: user.name.replace(/(\w+)\s+(\w)\w*/, '$1 $2.'), flat: user.flat }),
      rating: stars[l.itemId], comment, photos: n === 0 ? photos.map((p) => p.url) : [], createdAt,
    })))
    markRated(order.id)
    Toast.show({ icon: 'success', content: 'Review posted' })
    navigate(`/kitchen/${order.kitchenId}/reviews`, { replace: true })
  }

  // Backend orders are one dish each: one rating, saved by /orders/review.
  const submitApi = async () => {
    setBusy(true)
    const refresh = () => {
      invalidate(ordersKey(user.id)); invalidate(`order:${order.id}`)
      invalidate(`reviews:${order.kitchenId}`); invalidate(`myReviews:${user.id}`)
    }
    try {
      await api.reviewOrder({
        orderId: order.id, rating: stars[order.lines[0].itemId], description: comment.trim(),
        images: photos.map((p) => p.extra?.path).filter(Boolean), anonymous,
      })
      refresh()
      Toast.show({ icon: 'success', content: 'Review posted' })
      navigate(`/kitchen/${order.kitchenId}/reviews`, { replace: true })
    } catch (err) {
      if (err.status === 409) {
        refresh()
        Toast.show({ content: 'This order is already reviewed.' })
        navigate(`/orders/${order.id}`, { replace: true })
      } else Toast.show({ icon: 'fail', content: errorText(err) })
    } finally { setBusy(false) }
  }

  // Backend: the photo goes to Storage right away (signed upload URL); the review sends its path.
  const upload = async (file) => {
    if (!fromApi) return { url: await shrinkImage(file) }
    try {
      const { url, path } = await api.uploadReviewPhoto(user.id, file)
      return { url, extra: { path } }
    } catch (err) {
      Toast.show({ icon: 'fail', content: errorText(err) })
      throw err
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>Rate your food</NavBar>
      <div className="pad stack" style={{ paddingTop: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <Image src={k?.thumb ?? order.lines[0]?.photo} width={52} height={52} fit="cover" style={{ borderRadius: 12 }} />
          <div>
            <div className="h2">{kName}</div>
            <div className="muted mono" style={{ fontSize: 12 }}>Order #{order.code ?? order.id}</div>
          </div>
        </div>

        {order.lines.map((l) => (
          <Card key={l.itemId}>
            <div className="row" style={{ gap: 12 }}>
              <Image src={l.photo} width={48} height={48} fit="cover" style={{ borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.name}</div>
                <div className="muted" style={{ fontSize: 12, minHeight: 16 }}>{label(stars[l.itemId])}</div>
              </div>
            </div>
            <Rate allowHalf value={stars[l.itemId] ?? 0} onChange={(v) => setStars((s) => ({ ...s, [l.itemId]: v }))} style={{ '--star-size': '32px', marginTop: 10 }} />
          </Card>
        ))}

        <Card title="Tell your neighbours">
          <TextArea placeholder="Taste, portion, packaging — what stood out?" value={comment} onChange={setComment} autoSize={{ minRows: 3, maxRows: 6 }} maxLength={400} showCount />
        </Card>

        <Card title="Add photos">
          <ImageUploader value={photos} onChange={setPhotos} maxCount={4} upload={upload} />
        </Card>

        <Card>
          <div className="row between" style={{ gap: 12 }} onClick={() => setAnonymous((a) => !a)}>
            <div>
              <div style={{ fontWeight: 600 }}>Post anonymously</div>
              <div className="muted" style={{ fontSize: 12 }}>Your name and flat won’t be shown</div>
            </div>
            <Switch checked={anonymous} style={{ pointerEvents: 'none' }} />
          </div>
        </Card>

        <Button block size="large" color="primary" disabled={!ready} loading={busy} onClick={fromApi ? submitApi : submitLocal}>Post review</Button>
      </div>
    </div>
  )
}
