import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Checkbox, Dialog, Empty, Grid, List, Tag, Toast } from 'antd-mobile'
import { useNow } from '../../hooks/index.js'
import { dishStats, useCook } from '../../store/cook.js'
import { timeAgo } from '../../lib/format.js'
import { CookHeader, ReadyStrip } from './parts.jsx'
import { RequestList } from '../shared.jsx'
import { useRequests } from '../../store/requests.js'
import { useMyKitchen } from '../../store/index.js'

const STATUS = { pending: ['Pending', 'warning'], accepted: ['Accepted', 'success'], cooking: ['Accepted', 'success'], ready: ['Ready · notified', 'success'], picked: ['Picked up', 'default'], rejected: ['Rejected', 'default'] }
const ACTIVE = ['accepted', 'ready']

export default function CookOrders() {
  const navigate = useNavigate()
  const { dishes, incoming, accept, reject, simulateOrder } = useCook()
  const myKitchenId = useMyKitchen((s) => s.kitchen?.id)
  const allRequests = useRequests((s) => s.requests)
  const simulateRequest = useRequests((s) => s.simulateIncoming)
  const kitchenRequests = allRequests.filter((r) => r.kitchenId === myKitchenId)
  const newRequests = kitchenRequests.filter((r) => r.status === 'open').length
  const lastActivity = (r) => Math.max(r.createdAt, ...r.messages.map((m) => m.at))
  const requestsByTime = [...kitchenRequests].sort((a, b) => lastActivity(b) - lastActivity(a))
  const now = useNow(30000)
  const [filter, setFilter] = useState(null)    // dish id or null for all
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([])

  const live = dishes.filter((d) => d.live)
  const liveIds = new Set(live.map((d) => d.id))
  const dishOf = (id) => dishes.find((d) => d.id === id)
  const orders = incoming
    // Live dishes, plus real buyer orders still being cooked even if the dish went offline.
    .filter((o) => (liveIds.has(o.dishId) || (o.buyerOrderId && ACTIVE.includes(o.status))) && (!filter || o.dishId === filter))
    .sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? b.at - a.at : a.status === 'pending' ? -1 : 1)
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  const acceptOne = async (o) => {
    const d = dishOf(o.dishId); const s = dishStats(d, incoming)
    if (o.qty > s.left) {
      return Dialog.alert({ title: 'Not enough portions', content: `Only ${s.left} left of ${s.portions}. Reject this order or increase portions on the Dishes tab.`, confirmText: 'OK' })
    }
    const ok = await Dialog.confirm({
      title: `Accept ${o.qty} portion${o.qty > 1 ? 's' : ''}?`,
      content: `${o.buyer.name} (${o.buyer.flat}) · ${d.name}. You'll have ${s.left - o.qty} of ${s.portions} left.`,
      confirmText: 'Accept', cancelText: 'Cancel',
    })
    if (ok) { accept([o.id]); Toast.show({ icon: 'success', content: 'Accepted' }) }
  }

  // Accept pending orders oldest-first while portions last.
  const acceptAllThatFit = () => {
    const left = Object.fromEntries(live.map((d) => [d.id, dishStats(d, incoming).left]))
    const ids = []
    ;[...orders].filter((o) => o.status === 'pending').sort((a, b) => a.at - b.at).forEach((o) => {
      if (o.qty <= left[o.dishId]) { left[o.dishId] -= o.qty; ids.push(o.id) }
    })
    if (!ids.length) return Toast.show({ content: 'No pending orders fit the portions left' })
    accept(ids); Toast.show({ icon: 'success', content: `Accepted ${ids.length} order${ids.length > 1 ? 's' : ''}` })
  }

  const rejectSelected = async () => {
    const qty = incoming.filter((o) => selected.includes(o.id)).reduce((s, o) => s + o.qty, 0)
    const ok = await Dialog.confirm({ title: `Reject ${selected.length} order${selected.length > 1 ? 's' : ''}?`, content: `${qty} portion${qty > 1 ? 's' : ''} in total. Neighbours will be refunded.`, confirmText: 'Reject', cancelText: 'Cancel' })
    if (ok) { reject(selected); setSelected([]); setSelecting(false); Toast.show({ content: 'Rejected' }) }
  }

  const selQty = incoming.filter((o) => selected.includes(o.id)).reduce((s, o) => s + o.qty, 0)

  return (
    <div style={{ paddingBottom: selecting ? 0 : 24 }}>
      <CookHeader title="Incoming orders" />
      <ReadyStrip />

      {(
        <>
          {/* One box per live dish */}
          <div className="pad" style={{ marginTop: 12 }}>
            <Grid columns={2} gap={10}>
              <Grid.Item>
                <Card onClick={() => setFilter(null)} className={`dish-box ${!filter ? 'active' : ''}`}>
                  <div className="caps" style={{ color: 'inherit' }}>All dishes</div>
                  <div className="mono" style={{ fontSize: 22, marginTop: 6 }}>{incoming.filter((o) => liveIds.has(o.dishId) && o.status === 'pending').length}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>pending orders</div>
                </Card>
              </Grid.Item>
              {/* Custom orders: every chat request, newest first */}
              <Grid.Item>
                <Badge content={newRequests || null} style={{ '--right': '8px', '--top': '8px' }}>
                  <Card onClick={() => { setFilter('custom'); setSelecting(false) }} className={`dish-box custom-box ${filter === 'custom' ? 'active' : ''}`}>
                    <div className="h3 box-name">Custom orders</div>
                    <div className="row" style={{ gap: 14, marginTop: 6 }}>
                      <div><div className="mono" style={{ fontSize: 18 }}>{kitchenRequests.length}</div><div style={{ fontSize: 11, opacity: 0.75 }}>requests</div></div>
                      <div><div className="mono" style={{ fontSize: 18 }}>{newRequests}</div><div style={{ fontSize: 11, opacity: 0.75 }}>new</div></div>
                    </div>
                  </Card>
                </Badge>
              </Grid.Item>
              {live.map((d) => {
                const s = dishStats(d, incoming)
                return (
                  <Grid.Item key={d.id}>
                    <Badge content={s.pendingCount || null} style={{ '--right': '8px', '--top': '8px' }}>
                      <Card onClick={() => setFilter(d.id)} className={`dish-box ${filter === d.id ? 'active' : ''} ${s.over ? 'over' : ''}`}>
                        <div className="h3 box-name">{d.name}</div>
                        <div className="row" style={{ gap: 14, marginTop: 6 }}>
                          <div><div className="mono" style={{ fontSize: 18 }}>{s.ordered}</div><div style={{ fontSize: 11, opacity: 0.75 }}>ordered</div></div>
                          <div><div className="mono" style={{ fontSize: 18 }}>{s.left}</div><div style={{ fontSize: 11, opacity: 0.75 }}>left of {s.portions}</div></div>
                        </div>
                        {s.over > 0 && <div className="over-note">Over by {s.over} — reject extras</div>}
                      </Card>
                    </Badge>
                  </Grid.Item>
                )
              })}
            </Grid>
          </div>

          <div className="pad row between" style={{ marginTop: 18 }}>
            <h2 className="h2">{filter === 'custom' ? 'Custom orders' : filter ? dishOf(filter)?.name : 'All orders'}</h2>
            {pendingCount > 0 && filter !== 'custom' && (
              <Button size="mini" shape="rounded" fill={selecting ? 'solid' : 'outline'} onClick={() => { setSelecting((v) => !v); setSelected([]) }}>
                {selecting ? 'Cancel' : 'Select'}
              </Button>
            )}
          </div>

          {filter === 'custom' ? (
            <>
              {requestsByTime.length === 0 && <Empty description="No custom requests yet. Neighbours can request one from your kitchen page." />}
              <RequestList requests={requestsByTime} asCook header="Newest first" onOpen={(r) => navigate(`/cook/requests/${r.id}`)} />
              <div className="pad" style={{ marginTop: 8 }}>
                <Button size="mini" fill="none" style={{ color: 'var(--ink-2)', padding: 0 }} onClick={() => { simulateRequest(myKitchenId); Toast.show({ content: 'New custom request' }) }}>Demo: simulate a custom request</Button>
              </div>
            </>
          ) : orders.length === 0 ? <Empty description={live.length ? 'No orders for this dish yet.' : 'No dishes are live. Put a dish live on the Dishes tab and orders will show up here.'} /> : (
            <Checkbox.Group value={selected} onChange={setSelected}>
              <List mode="card" style={{ margin: '10px 16px 0' }}>
                {orders.map((o) => {
                  const [label, color] = STATUS[o.status]
                  const pending = o.status === 'pending'
                  return (
                    <List.Item key={o.id}
                      prefix={selecting && pending ? <Checkbox value={o.id} /> : null}
                      description={<>
                        <span className="mono">{o.buyer.flat} · {timeAgo(o.at, now)}{filter ? '' : ` · ${dishOf(o.dishId)?.name}`}</span>
                        {o.note && <div style={{ marginTop: 2 }}>“{o.note}”</div>}
                      </>}
                      extra={pending && !selecting
                        ? <Button size="small" color="success" shape="rounded" onClick={() => acceptOne(o)}>Accept</Button>
                        : <Tag round color={color} fill={o.status === 'ready' ? 'solid' : 'outline'}>{label}</Tag>}
                      style={{ opacity: o.status === 'rejected' ? 0.5 : 1 }}
                    >
                      <span style={{ fontWeight: 600 }}>{o.buyer.name}</span>
                      {o.buyer.you && <Tag round color="primary" style={{ marginLeft: 6, '--text-color': 'var(--ink)' }}>You</Tag>}
                      <span className="mono" style={{ marginLeft: 8 }}>× {o.qty} portion{o.qty > 1 ? 's' : ''}</span>
                    </List.Item>
                  )
                })}
              </List>
            </Checkbox.Group>
          )}

          {!selecting && filter !== 'custom' && live.length > 0 && (
            <div className="pad stack" style={{ marginTop: 14 }}>
              {pendingCount > 0 && <Button block color="success" fill="outline" onClick={acceptAllThatFit}>Accept all that fit</Button>}
              <Button size="mini" fill="none" style={{ color: 'var(--ink-2)' }} onClick={() => simulateOrder(filter) && Toast.show({ content: 'New order arrived' })}>
                Demo: simulate a new order
              </Button>
            </div>
          )}

          {selecting && (
            <div className="sticky-bottom" style={{ marginTop: 12 }}>
              <Button block size="large" color="danger" disabled={!selected.length} onClick={rejectSelected}>
                Reject {selected.length || ''} selected{selected.length ? ` (${selQty} portion${selQty > 1 ? 's' : ''})` : ''}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
