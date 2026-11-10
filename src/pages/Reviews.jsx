import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, Empty, NavBar, ProgressBar, Rate, Selector, Skeleton } from 'antd-mobile'
import { useQuery } from '../hooks/index.js'
import { api } from '../services/api.js'
import { useMyReviews } from '../store/index.js'
import { dishRating, kitchenRating } from '../lib/ratings.js'
import { isMyKitchenId, useMyBuyerKitchen } from '../lib/myKitchen.js'
import { ReviewItem } from './shared.jsx'

export default function Reviews() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const myKitchen = useMyBuyerKitchen()
  const queried = useQuery('kitchen:' + id, () => api.getKitchen(id))
  const kitchen = isMyKitchenId(id) ? myKitchen : queried
  const base = useQuery('reviews:' + id, () => api.listReviews(id))
  const mine = useMyReviews((s) => s.reviews).filter((r) => r.kitchenId === id)
  const [dish, setDish] = useState([params.get('dish') || 'all'])
  const [photosOnly, setPhotosOnly] = useState([])

  const all = useMemo(() => [...mine, ...(base ?? [])].sort((a, b) => b.createdAt - a.createdAt), [mine, base])
  const dishes = [...new Set([...(kitchen?.items ?? []), ...(kitchen?.offMenu ?? [])].map((d) => d.name).concat(all.map((r) => r.itemName)))]
  const shown = all.filter((r) => (dish[0] === 'all' || r.itemName === dish[0]) && (!photosOnly.length || r.photos?.length))

  if (!kitchen || !base) return <div className="pad" style={{ paddingTop: 20 }}><Skeleton.Title animated /><Skeleton.Paragraph lineCount={8} animated /></div>
  // All dishes → the kitchen's weighted rating; one dish → that dish's own rating.
  const s = dish[0] === 'all' ? kitchenRating(kitchen, mine) : dishRating(kitchen, dish[0], mine)

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>Ratings & reviews</NavBar>
      <div className="pad stack" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <Card>
          <div className="caps">{kitchen.name}{dish[0] !== 'all' ? ` · ${dish[0]}` : ''}</div>
          <div className="row" style={{ gap: 18, marginTop: 10, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', minWidth: 86 }}>
              <div className="serif" style={{ fontSize: 44, lineHeight: '46px' }}>{s.count ? s.avg.toFixed(1) : '–'}</div>
              <Rate readOnly allowHalf value={s.avg} style={{ '--star-size': '12px' }} />
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.count} ratings</div>
            </div>
            <div style={{ flex: 1 }} className="stack">
              {s.dist.map((n, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <span className="mono muted" style={{ width: 10, fontSize: 12 }}>{5 - i}</span>
                  <ProgressBar percent={s.count ? (n / s.count) * 100 : 0} style={{ flex: 1, '--track-width': '6px', '--fill-color': 'var(--turmeric)', '--track-color': 'var(--paper-deep)' }} />
                  <span className="mono faint" style={{ width: 28, fontSize: 12, textAlign: 'right' }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div>
          <div className="caps" style={{ marginBottom: 8 }}>Filter by dish</div>
          <Selector
            options={[{ label: 'All dishes', value: 'all' }, ...dishes.map((d) => ({ label: d, value: d }))]}
            value={dish} onChange={(v) => v.length && setDish(v)} showCheckMark={false}
            style={{ '--border-radius': '999px', '--checked-color': 'var(--turmeric-soft)', '--checked-text-color': 'var(--ink)', '--color': 'var(--card)', '--padding': '6px 12px' }}
          />
          <Selector
            options={[{ label: 'With photos only', value: 'photos' }]} multiple value={photosOnly} onChange={setPhotosOnly} showCheckMark={false}
            style={{ marginTop: 8, '--border-radius': '999px', '--checked-color': 'var(--ink)', '--checked-text-color': 'var(--paper)', '--color': 'var(--card)', '--padding': '6px 12px' }}
          />
        </div>

        {shown.length === 0 ? <Empty description="No reviews match these filters yet." /> : shown.map((r) => <ReviewItem key={r.id} review={r} />)}
      </div>
    </div>
  )
}
