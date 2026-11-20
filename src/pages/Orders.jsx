import { useNavigate } from 'react-router-dom'
import { Button, Empty, Image, List, Skeleton, Tag } from 'antd-mobile'
import { useNow } from '../hooks/index.js'
import { kitchenById } from '../store/catalog.js'
import { ACCEPTED, PICKED, READY, STATUSES, isRejected, statusIndex } from '../store/index.js'
import { dateTime, rupees } from '../lib/format.js'
import { canReview } from '../lib/orderStatus.js'
import { useAllOrders } from '../lib/data.js'
import { useRequests } from '../store/requests.js'
import { LoadError, RequestList } from './shared.jsx'

export const statusColor = (i) => (i >= READY ? 'success' : i === ACCEPTED ? 'primary' : 'default')
export const statusTagStyle = (i) => (i === 0 ? { '--text-color': 'var(--ink)', background: 'var(--paper-deep)' } : i === ACCEPTED ? { '--text-color': 'var(--ink)' } : {})

// Backend orders can be rated when the server allows it (status delivered/completed, no review yet);
// local demo orders once picked up, on this phone.
export const rateable = (order, i) => (order.source === 'api' ? canReview(order) : i === PICKED && !order.ratedAt)
export const isReviewed = (order, i) => (order.source === 'api' ? !!order.reviewId : i === PICKED && !!order.ratedAt)

export default function Orders() {
  const navigate = useNavigate()
  // Real orders from /orders/user-all, plus demo orders paid on this phone (no place-order endpoint yet).
  const { orders, loaded, failed, reload } = useAllOrders()
  const allRequests = useRequests((s) => s.requests)
  const myRequests = allRequests.filter((r) => r.buyer.you)
  const now = useNow(2000)
  const active = orders.filter((o) => statusIndex(o, now) < PICKED && !isRejected(o))
  const past = orders.filter((o) => statusIndex(o, now) === PICKED || isRejected(o))

  const row = (o) => {
    const name = o.kitchenName ?? kitchenById(o.kitchenId)?.name ?? 'Kitchen'
    const i = statusIndex(o, now); const rejected = isRejected(o)
    const demo = o.source !== 'api'
    return (
      <List.Item key={o.id} onClick={() => navigate(`/orders/${o.id}`)} arrow
        prefix={<Image src={o.lines[0]?.photo} width={52} height={52} fit="cover" style={{ borderRadius: 10 }} />}
        description={<>
          <div>{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</div>
          <div className="mono" style={{ marginTop: 2 }}>
            {[`#${o.code ?? o.id}`, o.total != null && rupees(o.total), o.placedAt && dateTime(o.placedAt), demo && 'demo'].filter(Boolean).join(' · ')}
          </div>
        </>}
        extra={rejected ? <Tag round color="danger" fill="outline">{demo ? 'Rejected · refunded' : o.statusLabel}</Tag> : rateable(o, i)
          ? <Button size="mini" color="primary" shape="rounded" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}/rate`) }}>Rate</Button>
          : <Tag round color={statusColor(i)} fill={i === PICKED ? 'outline' : 'solid'} style={statusTagStyle(i)}>{STATUSES[i]}</Tag>}
      >
        <span className="h3">{name}</span>
      </List.Item>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="pad" style={{ paddingTop: 20, paddingBottom: 8 }}>
        <h1 className="h1">Your orders</h1>
      </div>
      <RequestList requests={myRequests} onOpen={(r) => navigate(`/requests/${r.id}`)} />
      {!loaded && orders.length === 0 && <div className="pad"><Skeleton.Paragraph lineCount={6} animated /></div>}
      {failed && <div className="pad" style={{ marginTop: 24 }}><LoadError what="your orders" onRetry={reload} /></div>}
      {loaded && !failed && orders.length === 0 && myRequests.length === 0 && (
        <div className="pad">
          <Empty style={{ marginTop: 40 }} description="No orders yet. Your neighbours are cooking — take a look." />
          <Button block color="primary" size="large" onClick={() => navigate('/')}>Find a kitchen</Button>
        </div>
      )}
      {active.length > 0 && <List mode="card" header="Track your orders" style={{ margin: '8px 16px 0' }}>{active.map(row)}</List>}
      {past.length > 0 && <List mode="card" header="Past orders" style={{ margin: '16px 16px 0' }}>{past.map(row)}</List>}
    </div>
  )
}
