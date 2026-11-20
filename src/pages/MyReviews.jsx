import { useNavigate } from 'react-router-dom'
import { Button, Empty, NavBar, Skeleton } from 'antd-mobile'
import { kitchenName, useAllMyReviews } from '../lib/data.js'
import { LoadError, ReviewItem } from './shared.jsx'

export default function MyReviews() {
  const navigate = useNavigate()
  // /review/user-all, plus reviews of demo orders paid on this phone.
  const { reviews, failed, reload } = useAllMyReviews()
  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>All your reviews</NavBar>
      <div className="pad stack" style={{ paddingTop: 16 }}>
        {failed && <LoadError what="your reviews" onRetry={reload} />}
        {!reviews ? <Skeleton.Paragraph lineCount={8} animated /> : failed && reviews.length === 0 ? null : reviews.length === 0 ? (
          <>
            <Empty description="You haven’t reviewed anything yet. After you pick up an order, you can rate it here." />
            <Button block color="primary" onClick={() => navigate('/orders')}>Go to your orders</Button>
          </>
        ) : reviews.map((r) => (
          <ReviewItem key={r.id} review={r} kitchenName={kitchenName(r.kitchenId)} onKitchen={() => navigate(`/kitchen/${r.kitchenId}/reviews`)} />
        ))}
      </div>
    </div>
  )
}
