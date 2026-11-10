// Cook → Metrics: sales by day / week / month, plus what sells (orders, revenue, portions).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CapsuleTabs, Empty } from 'antd-mobile'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCook } from '../../store/cook.js'
import { useRequests } from '../../store/requests.js'
import { useMyKitchen } from '../../store/index.js'
import { CUSTOM_KEY, barData, buckets, colourKeys, notifyCounts, pieData, salesRecords } from '../../lib/sales.js'
import { useNotify } from '../../store/notify.js'
import { rupees } from '../../lib/format.js'
import { keepTouch } from '../stories.jsx'
import { CookHeader } from './parts.jsx'

const short = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `₹${n}`)
const RANGE_NOTE = { day: 'Last 7 days', week: 'Last 6 weeks · Monday to Sunday', month: 'Last 6 months' }
const since = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Two-line axis label: "Thu / 5", "9–15 / Nov", "Jun / 26"
function Tick({ x, y, payload, bars }) {
  const b = bars[payload.index]
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={11} fill="var(--ink-2)" fontFamily="var(--sans)" fontWeight={b?.current ? 700 : 400}>{payload.value}</text>
      <text dy={25} textAnchor="middle" fontSize={10} fill="var(--ink-3)" fontFamily="var(--sans)">{b?.sub}</text>
    </g>
  )
}

function BarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tip">
      <div className="t">{d.full}{d.current ? ' · so far' : ''}</div>
      <div>{rupees(d.revenue)} revenue</div>
      <div className="muted">{d.orders} orders · {d.portions} portions</div>
    </div>
  )
}

function Donut({ title, sub, data, format }) {
  const [active, setActive] = useState(null)
  if (!data.sum) return null
  const focus = active != null ? data.rows[active] : null
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="sub">{sub}</div>
      <div className="donut-wrap">
        <div style={{ width: 132, height: 132 }} {...keepTouch}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.rows} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}
                stroke="var(--card)" strokeWidth={2} isAnimationActive animationDuration={500}
                onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} onClick={(_, i) => setActive(i === active ? null : i)}>
                {data.rows.map((r, i) => <Cell key={r.key} fill={r.colour} opacity={active == null || active === i ? 1 : 0.35} />)}
              </Pie>
              <text x="50%" y="47%" textAnchor="middle" className="donut-center" fontSize={focus ? 15 : 16}>
                {focus ? `${Math.round(focus.pct * 100)}%` : format(data.sum)}
              </text>
              <text x="50%" y="60%" textAnchor="middle" fontSize={10} fill="var(--ink-2)">
                {focus ? (focus.name.length > 14 ? focus.name.slice(0, 13) + '…' : focus.name) : 'total'}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          {data.rows.map((r, i) => (
            <div key={r.key} className="legend-row" onClick={() => setActive(i === active ? null : i)} style={{ opacity: active == null || active === i ? 1 : 0.5 }}>
              <span className="sw" style={{ background: r.colour }} />
              <span className="nm">{r.name}</span>
              <span className="val">{format(r.value)} · {Math.round(r.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Metrics() {
  const navigate = useNavigate()
  const { dishes, incoming } = useCook()
  const requests = useRequests((s) => s.requests)
  const kitchenId = useMyKitchen((s) => s.kitchen?.id)
  const [range, setRange] = useState('day')
  const subs = useNotify((s) => s.subs)
  const now = Date.now()

  const records = useMemo(() => salesRecords({ dishes, incoming, requests, kitchenId }), [dishes, incoming, requests, kitchenId])
  const bs = useMemo(() => buckets(range), [range])
  const bars = useMemo(() => barData(records, bs), [records, bs])
  const keys = useMemo(() => colourKeys(records, dishes), [records, dishes])
  const nameOf = (k) => (k === CUSTOM_KEY ? 'Custom orders' : dishes.find((d) => d.id === k)?.name ?? 'Removed dish')
  const from = bs[0].start; const to = bs[bs.length - 1].end
  const pies = useMemo(() => ({
    orders: pieData(records, from, to, keys, nameOf, 'orders'),
    revenue: pieData(records, from, to, keys, nameOf, 'revenue'),
    portions: pieData(records, from, to, keys, nameOf, 'portions'),
  }), [records, from, to, keys]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Notify me" taps per dish (all dishes, current count — not tied to the range toggle)
  const notify = useMemo(() => {
    const all = notifyCounts(dishes, subs, kitchenId).sort((a, b) => b.value - a.value)
    const sum = all.reduce((t, r) => t + r.value, 0)
    const folded = {}
    all.forEach((r) => { const k = keys.includes(r.key) ? r.key : 'other'; folded[k] = (folded[k] ?? 0) + r.value })
    const rows = [...keys, 'other'].filter((k) => folded[k]).map((k) => ({
      key: k, name: k === 'other' ? 'Other dishes' : nameOf(k), value: folded[k], pct: sum ? folded[k] / sum : 0,
      colour: k === 'other' ? 'var(--series-other)' : `var(--series-${keys.indexOf(k) + 1})`,
    })).sort((a, b) => (a.key === 'other') - (b.key === 'other') || b.value - a.value)
    return { donut: { sum, rows }, all }
  }, [dishes, subs, kitchenId, keys]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = bars.reduce((t, b) => ({ revenue: t.revenue + b.revenue, orders: t.orders + b.orders, portions: t.portions + b.portions }), { revenue: 0, orders: 0, portions: 0 })

  if (!dishes.length) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <CookHeader title="Metrics" />
        <div className="pad" style={{ marginTop: 30 }}>
          <Empty description="Add dishes to see your sales." />
          <Button block color="primary" onClick={() => navigate('/cook', { replace: true })}>Go to Dishes</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 28 }}>
      <CookHeader title="Metrics" />
      <div {...keepTouch} style={{ marginTop: 10 }}>
        <CapsuleTabs activeKey={range} onChange={setRange} className="metrics-range">
          <CapsuleTabs.Tab title="Day" key="day" />
          <CapsuleTabs.Tab title="Week" key="week" />
          <CapsuleTabs.Tab title="Month" key="month" />
        </CapsuleTabs>
      </div>

      <div className="pad stack" style={{ marginTop: 6 }}>
        <div className="muted" style={{ fontSize: 12 }}>{RANGE_NOTE[range]} · {since(bs[0].start)} – today</div>

        <div className="metrics-tiles">
          <div className="stat-tile"><div className="v">{short(totals.revenue)}</div><div className="k">Revenue</div></div>
          <div className="stat-tile"><div className="v">{totals.orders}</div><div className="k">Orders</div></div>
          <div className="stat-tile"><div className="v">{totals.portions}</div><div className="k">Portions</div></div>
        </div>

        <div className="chart-card">
          <h3>Sales</h3>
          <div className="sub">Revenue per {range}{' · lighter bar = '}{range === 'day' ? 'today' : `this ${range}`} so far</div>
          <div style={{ width: '100%', height: 210 }} {...keepTouch}>
            <ResponsiveContainer>
              <BarChart data={bars} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={0} height={34} tick={<Tick bars={bars} />} />
                <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={46} tick={{ fontSize: 11 }} />
                <Tooltip content={<BarTip />} cursor={{ fill: 'var(--paper-deep)', opacity: 0.6 }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={500}>
                  {bars.map((b) => <Cell key={b.start} fill={b.current ? 'var(--bar-current)' : 'var(--bar)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Donut title="Most ordered" sub="Share of orders" data={pies.orders} format={(v) => `${v}`} />
        <Donut title="Top revenue" sub="Share of money earned" data={pies.revenue} format={short} />
        <Donut title="Most portions sold" sub="Share of portions" data={pies.portions} format={(v) => `${v}`} />

        <Donut title="Notify me requests" sub="Neighbours waiting to hear when a dish goes live · right now" data={notify.donut} format={(v) => `${v}`} />
        {notify.all.length > 0 && (
          <div className="chart-card" style={{ paddingTop: 10 }}>
            <div className="sub" style={{ marginBottom: 4 }}>Every dish</div>
            {notify.all.map((r) => (
              <div key={r.key} className="legend-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <span className="nm">{r.name}{r.mine ? ' · incl. you' : ''}</span>
                <span className="val">🔔 {r.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="faint" style={{ fontSize: 11, textAlign: 'center' }}>Includes sample history for the demo · real orders and custom requests are added on top</div>
      </div>
    </div>
  )
}
