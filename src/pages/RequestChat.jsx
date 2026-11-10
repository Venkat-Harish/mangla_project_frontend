// Custom order chat between a buyer and a kitchen.
// /requests/:id       → buyer view
// /cook/requests/:id  → cook view (your kitchen)
// Chat UI: @chatscope/chat-ui-kit-react, actions: antd-mobile.
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, MessageSeparator } from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { Button, DatePicker, Dialog, Empty, Form, Input, List, NavBar, NoticeBar, Popup, Tag, TextArea, Toast } from 'antd-mobile'
import { useNow } from '../hooks/index.js'
import { kitchenById } from '../services/api.js'
import { requestTag, useRequests } from '../store/requests.js'
import { useAuth, useOrders } from '../store/index.js'
import { clock, dayLabel, rupees } from '../lib/format.js'
import SlideToConfirm from './SlideToConfirm.jsx'

const when = (t) => `${dayLabel(t).toLowerCase()} ${clock(t)}`
const roundUp = (t, mins = 30) => Math.ceil(t / (mins * 60000)) * mins * 60000

function QuoteSheet({ request, visible, onClose }) {
  const quote = useRequests((s) => s.quote)
  const [form] = Form.useForm()
  const [readyAt, setReadyAt] = useState(() => request.quote?.readyAt ?? roundUp(Date.now() + 3 * 3600000))
  const [picker, setPicker] = useState(false)
  const bounds = useMemo(() => ({ min: new Date(), max: new Date(Date.now() + 7 * 86400000) }), [])
  const submit = (v) => {
    if (readyAt <= Date.now()) return Toast.show({ content: 'Pick a time in the future' })
    quote(request.id, { price: Number(v.price), readyAt, note: v.note?.trim() ?? '' })
    Toast.show({ icon: 'success', content: 'Quote sent' }); onClose()
  }
  return (
    <Popup visible={visible} onMaskClick={onClose} showCloseButton onClose={onClose}>
      <div style={{ padding: '20px 4px 24px' }}>
        <h2 className="h1 pad">{request.quote ? 'Update your quote' : 'Quote a price'}</h2>
        <div className="pad muted" style={{ fontSize: 13, marginTop: 4 }}>{request.portions} portion{request.portions > 1 ? 's' : ''} · “{request.text}”</div>
        <Form form={form} layout="vertical" onFinish={submit} requiredMarkStyle="none" initialValues={{ price: request.quote ? String(request.quote.price) : '', note: request.quote?.note ?? '' }}
          footer={<Button block type="submit" color="primary" size="large">Send quote</Button>}>
          <Form.Item name="price" label="Total price (₹)" rules={[{ required: true, message: 'Add a price' }, { pattern: /^\d{1,6}$/, message: 'Whole rupees only' }]}>
            <Input type="number" inputMode="numeric" placeholder="e.g. 600" />
          </Form.Item>
          <Form.Item label="Ready for pickup" onClick={() => setPicker(true)} arrow>
            <span className="mono">{when(readyAt)}</span>
          </Form.Item>
          <Form.Item name="note" label="Note (optional)">
            <TextArea placeholder="What’s included, packaging, anything to know" maxLength={160} autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
        <DatePicker visible={picker} onClose={() => setPicker(false)} precision="minute" min={bounds.min} max={bounds.max}
          filter={{ minute: (m) => m % 15 === 0 }} value={new Date(readyAt)} onConfirm={(d) => setReadyAt(d.getTime())} title="Ready for pickup" />
      </div>
    </Popup>
  )
}

export default function RequestChat() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const asCook = pathname.startsWith('/cook/')
  const me = asCook ? 'cook' : 'buyer'
  const navigate = useNavigate()
  useNow(5000)
  const request = useRequests((s) => s.requests.find((r) => r.id === id))
  const { send, decline, pay, markReady } = useRequests()
  const place = useOrders((s) => s.place)
  const pickUp = useOrders((s) => s.pickUp)
  const user = useAuth((s) => s.user)
  const [quoting, setQuoting] = useState(false)

  if (!request) return <><NavBar onBack={() => navigate(-1)}>Custom order</NavBar><Empty description="This request no longer exists." /></>
  const kitchen = kitchenById(request.kitchenId)
  const other = asCook ? `${request.buyer.name} · ${request.buyer.flat}` : kitchen?.name ?? 'Kitchen'
  const [tagText, tagColor] = requestTag(request)

  const onSend = (_html, text) => { const t = (text ?? '').trim(); if (t) send(request.id, me, t) }

  const payNow = async () => {
    await new Promise((r) => setTimeout(r, 900))   // simulated payment
    const orderId = place({
      kitchenId: request.kitchenId, total: request.quote.price, note: request.text, requestId: request.id,
      lines: [{ itemId: 'custom-' + request.id, name: `Custom: ${request.text.slice(0, 40)}${request.text.length > 40 ? '…' : ''} (${request.portions} portion${request.portions > 1 ? 's' : ''})`, price: request.quote.price, qty: 1, readyAt: request.quote.readyAt, photo: kitchen?.thumb }],
    })
    pay(request.id, orderId)
    Toast.show({ icon: 'success', content: 'Paid — order placed' })
  }

  const doDecline = async () => {
    const ok = await Dialog.confirm({ title: 'Decline this request?', content: `${request.buyer.name} will be told you can’t take it.`, confirmText: 'Decline', cancelText: 'Cancel' })
    if (ok) decline(request.id)
  }

  const bubble = (m) => {
    const mine = m.from === me
    const dir = mine ? 'outgoing' : 'incoming'
    if (m.from === 'system') return <MessageSeparator key={m.id}>{m.text} · {clock(m.at)}</MessageSeparator>
    if (m.type === 'request') {
      return (
        <Message key={m.id} model={{ direction: dir, position: 'single', type: 'custom' }}>
          <Message.CustomContent>
            <div className="chat-request">
              <div className="caps">Custom order · {m.portions} portion{m.portions > 1 ? 's' : ''}</div>
              <div style={{ marginTop: 4 }}>{m.text}</div>
            </div>
          </Message.CustomContent>
          <Message.Footer sentTime={clock(m.at)} />
        </Message>
      )
    }
    if (m.type === 'quote') {
      const latest = request.quote && request.messages.filter((x) => x.type === 'quote').at(-1)?.id === m.id
      return (
        <Message key={m.id} model={{ direction: dir, position: 'single', type: 'custom' }}>
          <Message.CustomContent>
            <div className={`chat-quote ${latest ? '' : 'old'}`}>
              <div className="caps">{latest ? 'Quote' : 'Earlier quote'}</div>
              <div className="serif" style={{ fontSize: 26, margin: '2px 0' }}>{rupees(m.price)}</div>
              <div className="mono" style={{ fontSize: 12 }}>Ready {when(m.readyAt)}</div>
              {m.text && <div style={{ marginTop: 6, fontSize: 13 }}>{m.text}</div>}
            </div>
          </Message.CustomContent>
          <Message.Footer sentTime={clock(m.at)} />
        </Message>
      )
    }
    return (
      <Message key={m.id} model={{ message: m.text, direction: dir, position: 'single', sentTime: clock(m.at) }}>
        <Message.Footer sentTime={clock(m.at)} />
      </Message>
    )
  }

  const order = request.orderId ? useOrders.getState().orders.find((o) => o.id === request.orderId) : null
  const closed = ['declined', 'picked'].includes(request.status)

  return (
    <div className="chat-page">
      <NavBar onBack={() => navigate(-1)} right={<Tag round color={tagColor} style={tagColor === 'primary' ? { '--text-color': 'var(--ink)' } : {}}>{tagText}</Tag>}>
        <div style={{ lineHeight: 1.1 }}><div>{other}</div><div className="muted" style={{ fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 400 }}>Custom order</div></div>
      </NavBar>

      <div className="chat-body">
        <MainContainer>
          <ChatContainer>
            <MessageList>{request.messages.map(bubble)}</MessageList>
          </ChatContainer>
        </MainContainer>
      </div>

      <div className="chat-actions">
        {/* Cook */}
        {asCook && ['open', 'quoted'].includes(request.status) && (
          <div className="row" style={{ gap: 8 }}>
            <Button color="primary" shape="rounded" style={{ flex: 1 }} onClick={() => setQuoting(true)}>{request.quote ? 'Update quote' : 'Quote a price'}</Button>
            <Button shape="rounded" fill="outline" color="danger" onClick={doDecline}>Decline</Button>
          </div>
        )}
        {asCook && request.status === 'quoted' && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Waiting for {request.buyer.name.split(' ')[0]} to pay.</div>}
        {asCook && request.status === 'paid' && (
          <SlideToConfirm variant="soft" size="compact" label="Slide when ready" releaseLabel={`Release to notify ${request.buyer.name.split(' ')[0]}`}
            doneLabel={`${request.buyer.name.split(' ')[0]} notified`}
            onConfirm={() => new Promise((r) => setTimeout(r, 350))} onDone={() => markReady(request.id)} />
        )}
        {asCook && request.status === 'ready' && <NoticeBar color="info" content={`Waiting for ${request.buyer.name.split(' ')[0]} to pick up from your door.`} />}

        {/* Buyer */}
        {!asCook && request.status === 'open' && <div className="muted" style={{ fontSize: 12 }}>Waiting for {kitchen?.owner?.split(' ')[0] ?? 'the cook'} to send a price…</div>}
        {!asCook && request.status === 'quoted' && (
          <SlideToConfirm label={`Slide to pay ${rupees(request.quote.price)}`} doneLabel="Paid" size="compact" onConfirm={payNow} />
        )}
        {!asCook && request.status === 'paid' && (
          <Button block shape="rounded" onClick={() => navigate(`/orders/${request.orderId}`)}>Track order #{request.orderId} · ready {when(request.quote.readyAt)}</Button>
        )}
        {!asCook && request.status === 'ready' && order && (
          <div className="stack" style={{ gap: 8 }}>
            <NoticeBar color="info" wrap content={<span>Ready at <b>Flat {kitchen?.flat}</b>. Pickup code <b className="mono">{order.pickupCode}</b>.</span>} />
            <Button block color="success" shape="rounded" onClick={() => pickUp(order.id)}>I’ve picked it up</Button>
          </div>
        )}
        {request.status === 'declined' && <NoticeBar color="error" content="This request was declined. Nothing was charged." />}
      </div>

      {!closed && (
        <div className="chat-input">
          <MessageInput placeholder={asCook ? `Message ${request.buyer.name.split(' ')[0]}…` : 'Ask about ingredients, timing…'} attachButton={false} onSend={onSend} />
        </div>
      )}

      {asCook && <QuoteSheet key={request.quote?.price ?? 'new'} request={request} visible={quoting} onClose={() => setQuoting(false)} />}
    </div>
  )
}
