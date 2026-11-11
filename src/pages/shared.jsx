// Small compositions of antd-mobile parts used on more than one page.
import { Avatar, Card, Image, ImageViewer, List, Rate, Space, Tag } from 'antd-mobile'
import { requestTag } from '../store/requests.js'
import { kitchenById } from '../services/api.js'
import { dateTime, initials } from '../lib/format.js'
import { useMediaUrl } from '../lib/media.js'

// A photo or video from either a URL or a key stored on the phone (IndexedDB).
export function MediaView({ mediaKey, url: directUrl, type, height = 240, controls = false, thumb = false, style = {} }) {
  const stored = useMediaUrl(directUrl ? null : mediaKey)
  const url = directUrl ?? stored
  const s = { width: '100%', height, objectFit: 'cover', display: 'block', background: 'var(--paper-deep)', ...style }
  if (!url) return <div style={s} />
  return type === 'video'
    ? <video src={url} style={s} controls={controls} muted={thumb} autoPlay={thumb} loop={thumb} playsInline />
    : <img src={url} alt="" style={s} />
}

export function ReviewItem({ review, kitchenName, onKitchen }) {
  return (
    <Card>
      {kitchenName && (
        <div className="caps" style={{ marginBottom: 10, color: 'var(--ink)' }} onClick={onKitchen}>{kitchenName} ›</div>
      )}
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar src="" fallback={<span className="avatar-initials leaf">{review.anonymous ? '?' : initials(review.userName)}</span>} style={{ '--size': '36px', '--border-radius': '50%' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{review.anonymous ? 'Anonymous neighbour' : review.userName}</div>
            {!review.anonymous && <div className="mono muted" style={{ fontSize: 12 }}>{review.flat}</div>}
          </div>
        </div>
        <span className="mono muted" style={{ fontSize: 12 }}>{dateTime(review.createdAt)}</span>
      </div>
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        <Rate readOnly allowHalf value={review.rating} style={{ '--star-size': '13px' }} />
        <Tag round fill="outline" color="default" style={{ '--text-color': 'var(--ink-2)' }}>{review.itemName}</Tag>
      </div>
      {review.comment && <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: '20px' }}>{review.comment}</p>}
      {review.photos?.length > 0 && (
        <Space wrap style={{ marginTop: 10, '--gap': '8px' }}>
          {review.photos.map((src, i) => (
            <Image key={i} src={src} width={76} height={76} fit="cover" style={{ borderRadius: 8 }}
              onClick={() => ImageViewer.Multi.show({ images: review.photos, defaultIndex: i })} />
          ))}
        </Space>
      )}
    </Card>
  )
}

// Custom order chats as a list (buyer → Orders, cook → Cook Orders).
export function RequestList({ requests, asCook, onOpen, header = 'Custom requests' }) {
  if (!requests.length) return null
  return (
    <List mode="card" header={header} style={{ margin: '8px 16px 0' }}>
      {requests.map((r) => {
        const [text, color] = requestTag(r)
        const last = [...r.messages].reverse().find((m) => m.from !== 'system')
        const kitchen = kitchenById(r.kitchenId)
        const isNew = asCook && r.status === 'open'
        return (
          <List.Item key={r.id} arrow onClick={() => onOpen(r)}
            prefix={<Avatar src={asCook ? '' : kitchen?.thumb ?? ''} fallback={<span className="avatar-initials leaf">{initials(r.buyer.name)}</span>} style={{ '--size': '40px', '--border-radius': '50%' }} />}
            description={<>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.portions} portion{r.portions > 1 ? 's' : ''} · {r.text}</div>
              {last && last.type !== 'request' && <div className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.from === (asCook ? 'cook' : 'buyer') ? 'You: ' : ''}{last.type === 'quote' ? `Quote ₹${last.price}` : last.text}</div>}
            </>}
            extra={<Tag round color={isNew ? 'danger' : color} fill={isNew ? 'solid' : 'outline'} style={!isNew && color === 'primary' ? { '--text-color': 'var(--ink)' } : {}}>{isNew ? 'New' : text}</Tag>}
          >
            <span style={{ fontWeight: 600 }}>{asCook ? `${r.buyer.name} · ${r.buyer.flat}` : kitchen?.name ?? 'Kitchen'}</span>
          </List.Item>
        )
      })}
    </List>
  )
}

// Pushpin icon (antd-mobile-icons has none). Outline when off, filled when pinned.
export function PinIcon({ on = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M15.5 3.5l5 5-2.2.9-3.6 3.6.4 4.2-1.6 1.6-3.7-3.7-4.6 4.6-1.1-.1-.1-1.1 4.6-4.6-3.7-3.7 1.6-1.6 4.2.4 3.6-3.6z"
        fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
