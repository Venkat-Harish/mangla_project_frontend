import { useNavigate } from 'react-router-dom'
import { Button, Empty, Image, List, Tag } from 'antd-mobile'
import { useNow } from '../hooks/index.js'
import { kitchenById } from '../services/api.js'
import { ACCEPTED, PICKED, READY, STATUSES, isRejected, statusIndex, useOrders } from '../store/index.js'
import { dateTime, rupees } from '../lib/format.js'
import { useRequests } from '../store/requests.js'
import { RequestList } from './shared.jsx'

export const statusColor = (i) => (i >= READY ? 'success' : i === ACCEPTED ? 'primary' : 'default')
export const statusTagStyle = (i) => (i === 0 ? { '--text-color': 'var(--ink)', background: 'var(--paper-deep)' } : i === ACCEPTED ? { '--text-color': 'var(--ink)' } : {})

export default function Orders() {
  const navigate = useNavigate()
  const orders = useOrders((s) => s.orders)
  const allRequests = useRequests((s) => s.requests)
  const myRequests = allRequests.filter((r) => r.buyer.you)
  const now = useNow(2000)
  const active = orders.filter((o) => statusIndex(o, now) < PICKED && !isRejected(o))
  const past = orders.filter((o) => statusIndex(o, now) === PICKED || isRejected(o))

  const row = (o) => {
    const k = kitchenById(o.kitchenId); const i = statusIndex(o, now); const rejected = isRejected(o)
    return (
      <List.Item key={o.id} onClick={() => navigate(`/orders/${o.id}`)} arrow
        prefix={<Image src={o.lines[0].photo} width={52} height={52} fit="cover" style={{ borderRadius: 10 }} />}
        description={<>
          <div>{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</div>
          <div className="mono" style={{ marginTop: 2 }}>#{o.id} · {rupees(o.total)} · {dateTime(o.placedAt)}</div>
        </>}
        extra={rejected ? <Tag round color="danger" fill="outline">Rejected · refunded</Tag> : i === PICKED && !o.ratedAt
          ? <Button size="mini" color="primary" shape="rounded" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}/rate`) }}>Rate</Button>
          : <Tag round color={statusColor(i)} fill={i === PICKED ? 'outline' : 'solid'} style={statusTagStyle(i)}>{STATUSES[i]}</Tag>}
      >
        <span className="h3">{k?.name ?? 'Kitchen'}</span>
      </List.Item>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="pad" style={{ paddingTop: 20, paddingBottom: 8 }}>
        <h1 className="h1">Your orders</h1>
      </div>
      <RequestList requests={myRequests} onOpen={(r) => navigate(`/requests/${r.id}`)} />
      {orders.length === 0 && myRequests.length === 0 && (
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
