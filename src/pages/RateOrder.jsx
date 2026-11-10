import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Empty, Image, ImageUploader, NavBar, Rate, TextArea, Toast } from 'antd-mobile'
import { kitchenById } from '../services/api.js'
import { useAuth, useMyReviews, useOrders } from '../store/index.js'
import { shrinkImage } from '../lib/format.js'

const LABELS = ['', 'Not for me', 'Could be better', 'Good', 'Really good', 'Loved it']

export default function RateOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = useOrders((s) => s.orders.find((o) => o.id === id))
  const markRated = useOrders((s) => s.markRated)
  const addReviews = useMyReviews((s) => s.add)
  const user = useAuth((s) => s.user)
  const [stars, setStars] = useState({})
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState([])

  if (!order) return <><NavBar onBack={() => navigate(-1)}>Rate your food</NavBar><Empty description="Order not found" /></>
  const k = kitchenById(order.kitchenId)
  const ready = order.lines.every((l) => stars[l.itemId])

  const submit = () => {
    const createdAt = Date.now()
    addReviews(order.lines.map((l, n) => ({
      id: `${order.id}-${l.itemId}`, kitchenId: k.id, orderId: order.id, itemName: l.name,
      userName: user.name.replace(/(\w+)\s+(\w)\w*/, '$1 $2.'), flat: user.flat,
      rating: stars[l.itemId], comment, photos: n === 0 ? photos.map((p) => p.url) : [], createdAt,
    })))
    markRated(order.id)
    Toast.show({ icon: 'success', content: 'Review posted' })
    navigate(`/kitchen/${k.id}/reviews`, { replace: true })
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>Rate your food</NavBar>
      <div className="pad stack" style={{ paddingTop: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <Image src={k.thumb} width={52} height={52} fit="cover" style={{ borderRadius: 12 }} />
          <div>
            <div className="h2">{k.name}</div>
            <div className="muted mono" style={{ fontSize: 12 }}>Order #{order.id}</div>
          </div>
        </div>

        {order.lines.map((l) => (
          <Card key={l.itemId}>
            <div className="row" style={{ gap: 12 }}>
              <Image src={l.photo} width={48} height={48} fit="cover" style={{ borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.name}</div>
                <div className="muted" style={{ fontSize: 12, minHeight: 16 }}>{LABELS[stars[l.itemId] ?? 0]}</div>
              </div>
            </div>
            <Rate value={stars[l.itemId] ?? 0} onChange={(v) => setStars((s) => ({ ...s, [l.itemId]: v }))} style={{ '--star-size': '32px', marginTop: 10 }} />
          </Card>
        ))}

        <Card title="Tell your neighbours">
          <TextArea placeholder="Taste, portion, packaging — what stood out?" value={comment} onChange={setComment} autoSize={{ minRows: 3, maxRows: 6 }} maxLength={400} showCount />
        </Card>

        <Card title="Add photos">
          <ImageUploader value={photos} onChange={setPhotos} maxCount={4} upload={async (file) => ({ url: await shrinkImage(file) })} />
        </Card>

        <Button block size="large" color="primary" disabled={!ready} onClick={submit}>Post review</Button>
      </div>
    </div>
  )
}
