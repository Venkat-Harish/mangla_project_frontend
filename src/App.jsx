import { useEffect, useRef } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Swiper, TabBar } from 'antd-mobile'
import { AppOutline, BellOutline, FileOutline, HistogramOutline, ShopbagOutline, UnorderedListOutline } from 'antd-mobile-icons'
import { useAuth, useCart, useMyKitchen, usePrefs } from './store/index.js'
import { useTheme } from './hooks/index.js'
import { useCook } from './store/cook.js'
import { useRequests } from './store/requests.js'
import RequestChat from './pages/RequestChat.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Kitchen from './pages/Kitchen.jsx'
import Reviews from './pages/Reviews.jsx'
import Cart from './pages/Cart.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import RateOrder from './pages/RateOrder.jsx'
import Settings from './pages/Settings.jsx'
import MyReviews from './pages/MyReviews.jsx'
import RegisterKitchen from './pages/RegisterKitchen.jsx'
import CookDishes from './pages/cook/Dishes.jsx'
import CookOrders from './pages/cook/Orders.jsx'
import CookPosts from './pages/cook/Posts.jsx'
import CookDish from './pages/cook/Dish.jsx'
import CookMetrics from './pages/cook/Metrics.jsx'

// Swipeable sections, left to right. The middle one is the default.
const EAT = ['/orders', '/', '/cart']
const COOK = ['/cook/posts', '/cook', '/cook/orders', '/cook/metrics']

// One antd Swiper holds three pages; the URL and the swiper stay in sync.
function Sections({ paths, children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const ref = useRef(null)
  const target = Math.max(0, paths.indexOf(pathname))
  const current = useRef(target)

  useEffect(() => {
    if (current.current !== target) { current.current = target; ref.current?.swipeTo(target) }
  }, [target])

  return (
    <Swiper
      ref={ref} className="sections" defaultIndex={target} indicator={() => null} loop={false} stuckAtBoundary
      onIndexChange={(i) => { current.current = i; if (paths[i] !== pathname) navigate(paths[i], { replace: true }) }}
    >
      {children.map((page, i) => <Swiper.Item key={paths[i]}>{page}</Swiper.Item>)}
    </Swiper>
  )
}

function Shell() {
  const user = useAuth((s) => s.user)
  const cartCount = useCart((s) => Object.values(s.qty).reduce((a, b) => a + b, 0))
  const cooking = useMyKitchen((s) => !!s.kitchen && s.mode === 'cook')
  const pendingOrders = useCook((s) => s.incoming.filter((o) => o.status === 'pending' && s.dishes.find((d) => d.id === o.dishId)?.live).length)
  const myKitchenId = useMyKitchen((s) => s.kitchen?.id)
  const newRequests = useRequests((s) => s.requests.filter((r) => r.kitchenId === myKitchenId && r.status === 'open').length)
  const pending = pendingOrders + newRequests
  // Keeps simulated cooks / neighbours in custom-order chats moving.
  useEffect(() => { const t = setInterval(() => useRequests.getState().tick(), 1000); return () => clearInterval(t) }, [])
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (!user) return <Navigate to="/login" replace />
  // Each mode has its own home: Cook → Dishes, Eat → Home.
  if (cooking && EAT.includes(pathname)) return <Navigate to="/cook" replace />
  if (!cooking && pathname.startsWith('/cook')) return <Navigate to="/" replace />

  const inEat = EAT.includes(pathname)
  const inCook = COOK.includes(pathname)
  return (
    <div className="frame">
      {inEat || inCook ? <Outlet /> : <div className="scroll" key={pathname}><Outlet /></div>}
      {inEat && (
        <TabBar activeKey={pathname} onChange={(k) => navigate(k, { replace: true })} safeArea>
          <TabBar.Item key="/orders" icon={<UnorderedListOutline />} title="Orders" />
          <TabBar.Item key="/" icon={<AppOutline />} title="Home" />
          <TabBar.Item key="/cart" icon={<ShopbagOutline />} title="Cart" badge={cartCount ? cartCount : null} />
        </TabBar>
      )}
      {inCook && (
        <TabBar activeKey={pathname} onChange={(k) => navigate(k, { replace: true })} safeArea>
          <TabBar.Item key="/cook/posts" icon={<FileOutline />} title="Posts" />
          <TabBar.Item key="/cook" icon={<AppOutline />} title="Dishes" />
          <TabBar.Item key="/cook/orders" icon={<BellOutline />} title="Orders" badge={pending ? pending : null} />
          <TabBar.Item key="/cook/metrics" icon={<HistogramOutline />} title="Metrics" />
        </TabBar>
      )}
    </div>
  )
}

export default function App() {
  const user = useAuth((s) => s.user)
  useTheme(usePrefs((s) => s.theme))
  const eat = <Sections key="eat" paths={EAT}>{[<Orders key="o" />, <Home key="h" />, <Cart key="c" />]}</Sections>
  const cook = <Sections key="cook" paths={COOK}>{[<CookPosts key="p" />, <CookDishes key="d" />, <CookOrders key="o" />, <CookMetrics key="m" />]}</Sections>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <div className="frame"><div className="scroll"><Login /></div></div>} />
      <Route element={<Shell />}>
        {EAT.map((p) => <Route key={p} path={p} element={eat} />)}
        {COOK.map((p) => <Route key={p} path={p} element={cook} />)}
        <Route path="/kitchen/:id" element={<Kitchen />} />
        <Route path="/kitchen/:id/reviews" element={<Reviews />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/:id/rate" element={<RateOrder />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/reviews" element={<MyReviews />} />
        <Route path="/settings/kitchen" element={<RegisterKitchen />} />
        <Route path="/cook/dish/:id" element={<CookDish />} />
        <Route path="/requests/:id" element={<RequestChat />} />
        <Route path="/cook/requests/:id" element={<RequestChat />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
