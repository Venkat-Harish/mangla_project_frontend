import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Empty, Image, List, NavBar, NoticeBar, Result, Skeleton, Steps, Tag } from 'antd-mobile'
import { CheckCircleFill, ClockCircleOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { useNow, useQueryState } from '../hooks/index.js'
import { api, cookName, mapOrder } from '../services/api.js'
import { kitchenById } from '../store/catalog.js'
import { PICKED, READY, STATUSES, isRejected, statusIndex, stepTime, useOrders } from '../store/index.js'
import { clock, rupees } from '../lib/format.js'
import { ORDER_REFRESH_MS, isUuid, useApiOrders } from '../lib/data.js'
import { isReviewed, rateable, statusColor, statusTagStyle } from './Orders.jsx'

const NOTES = [
  'Payment received.',
  'Accepted — you’ll be alerted the moment it’s ready.',
  'Packed and waiting at the door.',
  'Collected. Enjoy your meal!',
]

// /orders/details has the current status and review, but no names: take those from the orders list
// (or the catalog when the order isn't in the list yet).
function mergeOrder(listed, raw) {
  if (!raw) return listed ?? null
  const k = kitchenById(raw.kitchen_id)
  const fresh = mapOrder({
    ...raw,
    kitchen_name: listed?.kitchenName ?? k?.name,
    dish_name: listed?.lines[0].name ?? k?.items.find((i) => i.id === raw.dish_id)?.name,
  })
  return listed ? { ...fresh, lines: [{ ...fresh.lines[0], photo: listed.lines[0].photo }] } : fresh
}

export default function OrderDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const local = useOrders((s) => s.orders.find((o) => o.id === id))
  const { advance, pickUp } = useOrders()
  const now = useNow(1000)
  // Backend orders: status refreshed from /orders/details while the page is open.
  const remote = !local && isUuid(id)
  const { data: apiOrders } = useApiOrders()
  const listed = apiOrders?.find((o) => o.id === id)
  const details = useQueryState(remote ? `order:${id}` : null, () => api.getOrder(id), { refreshMs: ORDER_REFRESH_MS })
  const order = useMemo(() => local ?? (remote ? mergeOrder(listed, details.data) : null), [local, remote, listed, details.data])

  if (!order) {
    const loading = remote && details.data === undefined && !details.error
    return <><NavBar onBack={() => navigate('/orders')}>Order</NavBar>{loading ? <div className="pad"><Skeleton.Paragraph lineCount={8} animated /></div> : <Empty description="Order not found" />}</>
  }
  const fromApi = order.source === 'api'
  const k = kitchenById(order.kitchenId)
  const kName = k?.name ?? order.kitchenName ?? 'Kitchen'
  const i = statusIndex(order, now)
  const rejected = isRejected(order)
  const first = cookName(k ?? { name: kName })
  // Orders to a kitchen run in this app wait for the cook's actions.
  const note = order.cookLinked && i === 0 ? `Waiting for ${first} to accept.` : NOTES[i]
  const readyTimes = order.lines.map((l) => l.readyAt).filter(Boolean)
  const readyBy = readyTimes.length ? Math.max(...readyTimes) : null
  const code = order.code ?? order.pickupCode

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavBar onBack={() => navigate('/orders')}>Order #{order.code ?? order.id}</NavBar>

      {params.get('paid') && !rejected && (
        <Result status="success" title={`Paid. ${first} is on it.`}
          description={<span className="mono">#{order.id}{order.total != null ? ` · ${rupees(order.total)}` : ''}</span>}
          style={{ background: 'transparent', paddingBottom: 0 }} />
      )}

      <div className="pad stack" style={{ paddingTop: 16 }}>
        <Card>
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="caps">{kName}</div>
              <div className="h1" style={{ marginTop: 6 }}>{rejected ? (fromApi ? order.statusLabel : 'Not accepted') : STATUSES[i]}</div>
              <div className="muted" style={{ marginTop: 4 }}>{rejected ? `${first} couldn’t take this order.` : note}</div>
            </div>
            {rejected ? <Tag round color="danger">{fromApi ? 'Not going ahead' : 'Refunded'}</Tag>
              : <Tag round color={statusColor(i)} style={statusTagStyle(i)}>{i + 1}/{STATUSES.length}</Tag>}
          </div>
          {i < PICKED && !rejected && readyBy && (
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <ClockCircleOutline /> <span>Ready for pickup by <b className="mono">{clock(readyBy)}</b></span>
            </div>
          )}
        </Card>

        {rejected && <NoticeBar color="error" wrap content={fromApi
          ? `This order is ${order.statusLabel.toLowerCase()}.`
          : `The kitchen couldn’t take this order — ${rupees(order.total)} has been refunded.`} />}

        {i === READY && !rejected && (
          <>
            <NoticeBar color="info" wrap icon={<EnvironmentOutline />}
              content={<span>Ready at <b>{k?.flat ? `Flat ${k.flat}` : kName}</b>{k?.block ? `, Block ${k.block}` : ''}. Show pickup code <b className="mono">{code}</b>.</span>} />
            {/* No backend endpoint to confirm a pickup yet: the kitchen updates backend orders. */}
            {!fromApi && <Button block size="large" color="success" onClick={() => pickUp(order.id)}>I’ve picked it up</Button>}
          </>
        )}

        {rateable(order, i) && (
          <Button block size="large" color="primary" onClick={() => navigate(`/orders/${order.id}/rate`)}>Rate your food</Button>
        )}
        {isReviewed(order, i) && (
          <NoticeBar color="info" icon={<CheckCircleFill />} content="Thanks — your review is live on the kitchen’s page." />
        )}

        <Card title="Progress">
          <Steps direction="vertical" current={i === PICKED ? STATUSES.length : i}>
            {STATUSES.map((s, n) => {
              const at = n <= i ? stepTime(order, n) : null
              return (
                <Steps.Step key={s} title={s}
                  status={n < i || i === PICKED ? 'finish' : n === i ? 'process' : 'wait'}
                  description={at ? <span className="mono">{clock(at)}</span> : '—'} />
              )
            })}
          </Steps>
          {i < PICKED && !rejected && !order.cookLinked && !order.requestId && !fromApi && (
            <Button size="mini" fill="none" style={{ color: 'var(--ink-2)' }} onClick={() => advance(order.id)}>
              Demo: move to next step
            </Button>
          )}
          {i < READY && !rejected && (order.cookLinked || order.requestId || fromApi) && (
            <div className="faint" style={{ fontSize: 12 }}>Updates live — you’ll see it here the moment {first} marks it ready.</div>
          )}
        </Card>

        <List mode="card" header="Items" style={{ margin: 0 }}>
          {order.lines.map((l) => (
            <List.Item key={l.itemId} prefix={<Image src={l.photo} width={40} height={40} fit="cover" style={{ borderRadius: 8 }} />}
              extra={l.price != null ? <span className="mono">{rupees(l.price * l.qty)}</span> : null}>{l.qty}× {l.name}</List.Item>
          ))}
          {order.total != null && <List.Item extra={<b className="mono">{rupees(order.total)}</b>}><b>Paid</b></List.Item>}
          {order.note && <List.Item description={order.note}>Your note</List.Item>}
        </List>

        <List mode="card" header="Pickup from" style={{ margin: 0 }}>
          <List.Item prefix={<EnvironmentOutline />} description={[k?.block && `Block ${k.block}`, k?.owner].filter(Boolean).join(' · ') || null}
            arrow onClick={() => navigate(`/kitchen/${order.kitchenId}`)}>
            {kName}{k?.flat ? `, Flat ${k.flat}` : ''}
          </List.Item>
        </List>

        {params.get('paid') && (
          <Button block fill="none" onClick={() => { setParams({}); navigate('/') }}>Back to home</Button>
        )}
      </div>
    </div>
  )
}
