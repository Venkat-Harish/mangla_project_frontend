import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Image, List, Stepper, Tag, TextArea, Toast } from 'antd-mobile'
import { ClockCircleOutline, EnvironmentOutline, PayCircleOutline } from 'antd-mobile-icons'
import { useNow } from '../hooks/index.js'
import { kitchenById } from '../services/api.js'
import { useAuth, useCart, useOrders } from '../store/index.js'
import { useCook } from '../store/cook.js'
import SlideToConfirm from './SlideToConfirm.jsx'
import { clock, dayLabel, rupees } from '../lib/format.js'

export default function Cart() {
  const navigate = useNavigate()
  const cart = useCart()
  const place = useOrders((s) => s.place)
  const user = useAuth((s) => s.user)
  const now = useNow(5000)
  const [paying, setPaying] = useState(false)
  const kitchen = cart.kitchenId ? kitchenById(cart.kitchenId) : null
  const lines = kitchen ? kitchen.items.filter((i) => cart.qty[i.id]) : []

  if (!kitchen || lines.length === 0) {
    return (
      <div className="pad" style={{ paddingTop: 24 }}>
        <h1 className="h1">Your cart</h1>
        <Empty style={{ marginTop: 60 }} description="Nothing here yet. Add something from a live kitchen." />
        <Button block color="primary" size="large" onClick={() => navigate('/', { replace: true })}>Browse kitchens</Button>
      </div>
    )
  }

  const open = lines.filter((i) => i.closesAt > now)
  const total = open.reduce((s, i) => s + i.price * cart.qty[i.id], 0)
  const readyBy = Math.max(...open.map((i) => i.readyAt), 0)

  const pay = async () => {
    setPaying(true)
    await new Promise((r) => setTimeout(r, 1100))   // simulated payment
    const id = place({
      kitchenId: kitchen.id, total, note: cart.note, cookLinked: !!kitchen.mine,
      lines: open.map((i) => ({ itemId: i.id, name: i.name, price: i.price, qty: cart.qty[i.id], readyAt: i.readyAt, photo: i.photo })),
    })
    // Ordering from a kitchen run in this app: the order lands in that cook's incoming orders.
    if (kitchen.mine) {
      useCook.getState().addFromBuyer(open.map((i) => ({ dishId: i.id, qty: cart.qty[i.id], buyer: { name: user.name, flat: user.flat, you: true }, buyerOrderId: id, note: cart.note })))
    }
    cart.clear()
    navigate(`/orders/${id}?paid=1`, { replace: true })
  }

  return (
    <div>
      <div className="pad" style={{ paddingTop: 20, paddingBottom: 12 }}>
        <h1 className="h1">Your cart</h1>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Pickup from one kitchen per order.</div>
      </div>

      <List mode="card" style={{ margin: '0 16px' }}>
        <List.Item
          prefix={<Image src={kitchen.thumb} width={44} height={44} fit="cover" style={{ borderRadius: 10 }} />}
          description={`by ${kitchen.owner}`} arrow onClick={() => navigate(`/kitchen/${kitchen.id}`)}
        >
          <span className="h3">{kitchen.name}</span>
        </List.Item>
      </List>

      <List mode="card" header="Items" style={{ margin: '12px 16px 0' }}>
        {lines.map((i) => {
          const closed = i.closesAt <= now
          return (
            <List.Item key={i.id}
              description={<span className="mono">{rupees(i.price)} each · ready {clock(i.readyAt)}</span>}
              extra={closed ? <Tag color="danger" fill="outline">Closed</Tag> : (
                <div style={{ textAlign: 'right' }}>
                  <Stepper value={cart.qty[i.id]} min={0} max={i.left} onChange={(v) => cart.setQty(kitchen.id, i.id, v)} style={{ '--height': '28px', '--input-width': '28px' }} />
                  <div className="mono" style={{ marginTop: 4, color: 'var(--ink)' }}>{rupees(i.price * cart.qty[i.id])}</div>
                </div>
              )}
            >
              <span style={{ fontWeight: 600, opacity: closed ? 0.5 : 1 }}>{i.name}</span>
            </List.Item>
          )
        })}
      </List>

      <List mode="card" header="Note for the cook" style={{ margin: '12px 16px 0' }}>
        <List.Item>
          <TextArea placeholder={`e.g. less spicy, bring my own box — ${kitchen.owner.split(' ')[0]} will see this`} value={cart.note} onChange={cart.setNote} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={140} showCount />
        </List.Item>
      </List>

      <List mode="card" header="Pickup" style={{ margin: '12px 16px 0' }}>
        <List.Item prefix={<EnvironmentOutline />} description={`Block ${kitchen.block}, ${user.society}`}>Flat {kitchen.flat}</List.Item>
        <List.Item prefix={<ClockCircleOutline />} description="We’ll notify you the moment it’s ready">
          Ready by <span className="mono">{dayLabel(readyBy, now).toLowerCase()} {clock(readyBy)}</span>
        </List.Item>
      </List>

      <List mode="card" header="Bill" style={{ margin: '12px 16px 0' }}>
        <List.Item extra={<span className="mono">{rupees(total)}</span>}>Item total</List.Item>
        <List.Item extra={<span className="mono">₹0</span>} description="Neighbours don’t pay delivery">Pickup fee</List.Item>
        <List.Item extra={<span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{rupees(total)}</span>}><b>To pay</b></List.Item>
        <List.Item prefix={<PayCircleOutline />} description="Simulated in this prototype">UPI</List.Item>
      </List>

      <div className="sticky-bottom" style={{ marginTop: 8 }}>
        <SlideToConfirm label={`Slide to pay ${rupees(total)}`} doneLabel="Paid" disabled={!open.length} onConfirm={pay} />
      </div>
    </div>
  )
}
