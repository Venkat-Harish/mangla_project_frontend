import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Empty, Image, List, NavBar, NoticeBar, Result, Steps, Tag } from 'antd-mobile'
import { CheckCircleFill, ClockCircleOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { useNow } from '../hooks/index.js'
import { kitchenById } from '../services/api.js'
import { ACCEPTED, PICKED, READY, STATUSES, isRejected, statusIndex, stepTime, useOrders } from '../store/index.js'
import { clock, rupees } from '../lib/format.js'
import { statusColor, statusTagStyle } from './Orders.jsx'

const NOTES = [
  'Payment received.',
  'Accepted — you’ll be alerted the moment it’s ready.',
  'Packed and waiting at the door.',
  'Collected. Enjoy your meal!',
]

export default function OrderDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const order = useOrders((s) => s.orders.find((o) => o.id === id))
  const { advance, pickUp } = useOrders()
  const now = useNow(1000)

  if (!order) return <><NavBar onBack={() => navigate('/orders')}>Order</NavBar><Empty description="Order not found" /></>
  const k = kitchenById(order.kitchenId)
  const i = statusIndex(order, now)
  const rejected = isRejected(order)
  const first = k.owner.split(' ')[0]
  // Orders to a kitchen run in this app wait for the cook's actions.
  const note = order.cookLinked && i === 0 ? `Waiting for ${first} to accept.` : NOTES[i]
  const readyBy = Math.max(...order.lines.map((l) => l.readyAt))

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavBar onBack={() => navigate('/orders')}>Order #{order.id}</NavBar>

      {params.get('paid') && !rejected && (
        <Result status="success" title={`Paid. ${first} is on it.`}
          description={<span className="mono">#{order.id} · {rupees(order.total)}</span>}
          style={{ background: 'transparent', paddingBottom: 0 }} />
      )}

      <div className="pad stack" style={{ paddingTop: 16 }}>
        <Card>
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="caps">{k.name}</div>
              <div className="h1" style={{ marginTop: 6 }}>{rejected ? 'Not accepted' : STATUSES[i]}</div>
              <div className="muted" style={{ marginTop: 4 }}>{rejected ? `${first} couldn’t take this order.` : note}</div>
            </div>
            {rejected ? <Tag round color="danger">Refunded</Tag>
              : <Tag round color={statusColor(i)} style={statusTagStyle(i)}>{i + 1}/{STATUSES.length}</Tag>}
          </div>
          {i < PICKED && !rejected && (
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <ClockCircleOutline /> <span>Ready for pickup by <b className="mono">{clock(readyBy)}</b></span>
            </div>
          )}
        </Card>

        {rejected && <NoticeBar color="error" wrap content={`The kitchen couldn’t take this order — ${rupees(order.total)} has been refunded.`} />}

        {i === READY && !rejected && (
          <>
            <NoticeBar color="info" wrap icon={<EnvironmentOutline />}
              content={<span>Ready at <b>Flat {k.flat}</b>, Block {k.block}. Show pickup code <b className="mono">{order.pickupCode}</b>.</span>} />
            <Button block size="large" color="success" onClick={() => pickUp(order.id)}>I’ve picked it up</Button>
          </>
        )}

        {i === PICKED && !order.ratedAt && (
          <Button block size="large" color="primary" onClick={() => navigate(`/orders/${order.id}/rate`)}>Rate your food</Button>
        )}
        {i === PICKED && order.ratedAt && (
          <NoticeBar color="info" icon={<CheckCircleFill />} content="Thanks — your review is live on the kitchen’s page." />
        )}

        <Card title="Progress">
          <Steps direction="vertical" current={i === PICKED ? STATUSES.length : i}>
            {STATUSES.map((s, n) => (
              <Steps.Step key={s} title={s}
                status={n < i || i === PICKED ? 'finish' : n === i ? 'process' : 'wait'}
                description={n <= i ? <span className="mono">{clock(stepTime(order, n))}</span> : '—'} />
            ))}
          </Steps>
          {i < PICKED && !rejected && !order.cookLinked && !order.requestId && (
            <Button size="mini" fill="none" style={{ color: 'var(--ink-2)' }} onClick={() => advance(order.id)}>
              Demo: move to next step
            </Button>
          )}
          {i < PICKED && !rejected && (order.cookLinked || order.requestId) && (
            <div className="faint" style={{ fontSize: 12 }}>Updates live — you’ll be alerted the moment {first} marks it ready.</div>
          )}
        </Card>

        <List mode="card" header="Items" style={{ margin: 0 }}>
          {order.lines.map((l) => (
            <List.Item key={l.itemId} prefix={<Image src={l.photo} width={40} height={40} fit="cover" style={{ borderRadius: 8 }} />}
              extra={<span className="mono">{rupees(l.price * l.qty)}</span>}>{l.qty}× {l.name}</List.Item>
          ))}
          <List.Item extra={<b className="mono">{rupees(order.total)}</b>}><b>Paid</b></List.Item>
          {order.note && <List.Item description={order.note}>Your note</List.Item>}
        </List>

        <List mode="card" header="Pickup from" style={{ margin: 0 }}>
          <List.Item prefix={<EnvironmentOutline />} description={`Block ${k.block} · ${k.owner}`} arrow onClick={() => navigate(`/kitchen/${k.id}`)}>
            {k.name}, Flat {k.flat}
          </List.Item>
        </List>

        {params.get('paid') && (
          <Button block fill="none" onClick={() => { setParams({}); navigate('/') }}>Back to home</Button>
        )}
      </div>
    </div>
  )
}
