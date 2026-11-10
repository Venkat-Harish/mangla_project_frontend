import { useNavigate } from 'react-router-dom'
import { Button, Empty, NavBar } from 'antd-mobile'
import { kitchenById } from '../services/api.js'
import { useMyReviews } from '../store/index.js'
import { ReviewItem } from './shared.jsx'

export default function MyReviews() {
  const navigate = useNavigate()
  const reviews = useMyReviews((s) => s.reviews)
  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>All your reviews</NavBar>
      <div className="pad stack" style={{ paddingTop: 16 }}>
        {reviews.length === 0 ? (
          <>
            <Empty description="You haven’t reviewed anything yet. After you pick up an order, you can rate it here." />
            <Button block color="primary" onClick={() => navigate('/orders')}>Go to your orders</Button>
          </>
        ) : reviews.map((r) => {
          const k = kitchenById(r.kitchenId)
          return <ReviewItem key={r.id} review={r} kitchenName={k.name} onKitchen={() => navigate(`/kitchen/${k.id}/reviews`)} />
        })}
      </div>
    </div>
  )
}
