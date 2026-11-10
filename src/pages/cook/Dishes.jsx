import { useNavigate } from 'react-router-dom'
import { Button, Card, Empty, Image, Tag, Toast } from 'antd-mobile'
import { AddOutline, PlayOutline, RightOutline } from 'antd-mobile-icons'
import { useNow } from '../../hooks/index.js'
import { coverOf, dishStats, useCook } from '../../store/cook.js'
import { sampleDishes } from '../../data/mock.js'
import { rupees } from '../../lib/format.js'
import { MediaView } from '../shared.jsx'
import { CookHeader, ReadyStrip, availability } from './parts.jsx'

const ORDER = { now: 0, preorder: 1, off: 2 }

export default function Dishes() {
  const navigate = useNavigate()
  const { dishes, incoming, addDish } = useCook()
  const now = useNow(15000)

  const rows = dishes.map((d) => ({ d, a: availability(d, now), s: dishStats(d, incoming) })).sort((x, y) => ORDER[x.a.kind] - ORDER[y.a.kind])
  const count = (k) => rows.filter((r) => r.a.kind === k).length

  return (
    <div style={{ paddingBottom: 24 }}>
      <CookHeader title="Your dishes" />
      <ReadyStrip />

      <div className="pad row between" style={{ marginTop: 12 }}>
        <span className="muted" style={{ fontSize: 13 }}>{count('now')} live · {count('preorder')} pre-order · {count('off')} off</span>
        <Button size="small" shape="rounded" color="primary" onClick={() => navigate('/cook/dish/new')}>
          <span className="row" style={{ gap: 4 }}><AddOutline /> Add dish</span>
        </Button>
      </div>

      <div className="pad stack" style={{ marginTop: 14 }}>
        {dishes.length === 0 ? (
          <>
            <Empty description="Add your first dish — photos, a name and a price is all it takes." />
            <Button block color="primary" size="large" onClick={() => navigate('/cook/dish/new')}>Add your first dish</Button>
            <Button block fill="none" onClick={() => { sampleDishes.forEach((d) => addDish(d)); Toast.show({ content: 'Sample dishes added' }) }}>Load sample dishes</Button>
          </>
        ) : rows.map(({ d, a, s }) => {
          const cover = coverOf(d); const first = d.media?.[0]
          return (
            <Card key={d.id} className={`dish-tile dish-${a.kind}`} onClick={() => navigate(`/cook/dish/${d.id}`)}>
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="dish-thumb">
                  {cover ? <Image src={cover} width={76} height={76} fit="cover" /> : first ? <MediaView mediaKey={first.key} type={first.type} height={76} thumb /> : null}
                  {d.media?.length > 1 && <span className="dish-count">{d.media.length}</span>}
                  {first?.type === 'video' && <span className="dish-play"><PlayOutline /></span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <div className="h2">{d.name}</div>
                    <RightOutline style={{ flex: '0 0 auto', marginTop: 4 }} />
                  </div>
                  <div className="mono muted" style={{ fontSize: 13, marginTop: 2 }}>{rupees(d.price)} / portion</div>
                  <Tag round className={`avail-tag ${a.kind}`} style={{ marginTop: 8 }}>{a.label}</Tag>
                  {d.live && (
                    <div className="mono" style={{ fontSize: 13, marginTop: 6, color: s.left <= 0 ? 'var(--chilli)' : 'var(--ink)' }}>
                      {s.left} of {s.portions} left{s.pendingCount ? ` · ${s.pendingCount} pending` : ''}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
