import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Dialog, List, NavBar, Popup, Selector, Steps, Tag, Toast } from 'antd-mobile'
import { ShopbagOutline, CheckShieldOutline, DownlandOutline, EditSOutline, EnvironmentOutline, PhonebookOutline, UnorderedListOutline, SendOutline, UploadOutline } from 'antd-mobile-icons'
import { useInstallPrompt } from '../hooks/index.js'
import { useAuth, useCart, useMyKitchen, useMyReviews, useOrders, usePins, usePrefs, useStories } from '../store/index.js'
import { APP_NAME } from '../config.js'
import { useCook } from '../store/cook.js'
import { useRequests } from '../store/requests.js'
import { useNotify } from '../store/notify.js'
import { clearMedia } from '../lib/media.js'

export default function Settings() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const myReviews = useMyReviews((s) => s.reviews)
  const orders = useOrders((s) => s.orders)
  const { canPrompt, install, isIOS, isAndroid, standalone } = useInstallPrompt()
  const [iosSteps, setIosSteps] = useState(false)
  const [androidSteps, setAndroidSteps] = useState(false)
  const { kitchen, mode, setMode } = useMyKitchen()
  const { theme, setTheme } = usePrefs()

  const onInstall = async () => {
    if (standalone) return Toast.show({ content: `${APP_NAME} is already installed` })
    if (canPrompt) return install()
    if (isIOS) return setIosSteps(true)
    if (isAndroid) return setAndroidSteps(true)
    Toast.show({ content: 'Open this page in Chrome on Android, or Safari on iPhone, to install.' })
  }

  const signOut = async () => {
    const ok = await Dialog.confirm({ content: 'Sign out? Your cart, orders and reviews on this phone will be cleared.', confirmText: 'Sign out', cancelText: 'Cancel' })
    if (!ok) return
    useCart.getState().clear(); useOrders.getState().clearAll(); useMyReviews.getState().clearAll(); useStories.getState().clearAll(); useMyKitchen.getState().clearAll(); useCook.getState().clearAll(); useRequests.getState().clearAll(); useNotify.getState().clearAll(); usePins.getState().clearAll(); clearMedia()
    logout()
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>Profile</NavBar>
      <div className="pad" style={{ paddingTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar src="" fallback={<span className="avatar-initials" style={{ fontSize: 22 }}>{user.initials}</span>} style={{ '--size': '64px', '--border-radius': '50%' }} />
        <div>
          <h1 className="h1">{user.name}</h1>
          <div className="mono muted" style={{ fontSize: 13 }}>{user.flat} · Block {user.block}</div>
          <Tag round color="success" fill="outline" style={{ marginTop: 6 }}>
            <span className="row" style={{ gap: 4 }}><CheckShieldOutline /> Verified resident</span>
          </Tag>
        </div>
      </div>

      <List mode="card" header="Your society" style={{ margin: '20px 16px 0' }}>
        <List.Item prefix={<EnvironmentOutline />} description={`Flat ${user.flat}`}>{user.society}</List.Item>
        <List.Item prefix={<PhonebookOutline />} description={`Signed in with ${user.via === 'mygate' ? 'MyGate' : user.via === 'google' ? 'Google' : 'phone'}`}>{user.phone}</List.Item>
      </List>

      {kitchen ? (
        <>
          <div className="pad" style={{ marginTop: 20 }}>
            <div className="caps" style={{ marginBottom: 8 }}>Mode</div>
            <Selector
              columns={2} value={[mode]} showCheckMark={false}
              options={[{ label: 'Eat mode', value: 'eat', description: 'Order from neighbours' }, { label: 'Cook mode', value: 'cook', description: 'Run your kitchen' }]}
              onChange={(v) => { if (v[0] && v[0] !== mode) { setMode(v[0]); Toast.show({ content: v[0] === 'cook' ? 'Cook mode on' : 'Eat mode on' }); navigate(v[0] === 'cook' ? '/cook' : '/', { replace: true }) } }}
              style={{ '--border-radius': '12px', '--checked-color': 'var(--ink)', '--checked-text-color': 'var(--paper)', '--color': 'var(--card)', '--padding': '12px 10px' }}
            />
          </div>
          <List mode="card" header="Your kitchen" style={{ margin: '16px 16px 0' }}>
            <List.Item prefix={<Avatar src={kitchen.logo} style={{ '--size': '44px', '--border-radius': '50%' }} />}
              description={kitchen.phone} arrow onClick={() => navigate('/settings/kitchen')}>
              <span className="h3">{kitchen.name}</span>
            </List.Item>
          </List>
        </>
      ) : (
        <List mode="card" header="Your kitchen" style={{ margin: '16px 16px 0' }}>
          <List.Item prefix={<ShopbagOutline />} arrow description="Cook for your neighbours. Takes a minute." onClick={() => navigate('/settings/kitchen')}>
            Register your kitchen
          </List.Item>
        </List>
      )}

      <div className="pad" style={{ marginTop: 20 }}>
        <div className="caps" style={{ marginBottom: 8 }}>Appearance</div>
        <Selector
          columns={3} value={[theme]} showCheckMark={false}
          options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'System', value: 'system', description: 'Match phone' }]}
          onChange={(v) => v[0] && setTheme(v[0])}
          style={{ '--border-radius': '12px', '--checked-color': 'var(--ink)', '--checked-text-color': 'var(--paper)', '--color': 'var(--card)', '--padding': '10px 6px' }}
        />
      </div>

      <List mode="card" header="Activity" style={{ margin: '16px 16px 0' }}>
        <List.Item prefix={<EditSOutline />} arrow extra={myReviews.length || null} onClick={() => navigate('/settings/reviews')}>All your reviews</List.Item>
        <List.Item prefix={<UnorderedListOutline />} arrow extra={orders.length || null} onClick={() => navigate('/orders', { replace: true })}>Order history</List.Item>
      </List>

      <List mode="card" header="App" style={{ margin: '16px 16px 0' }}>
        <List.Item prefix={<DownlandOutline />} arrow onClick={onInstall}
          description={standalone ? 'Installed — you’re using the app' : 'Add it to your home screen like a regular app'}>
          Install {APP_NAME}
        </List.Item>
      </List>

      <div className="pad" style={{ marginTop: 24 }}>
        <Button block size="large" color="danger" fill="outline" onClick={signOut}>Sign out</Button>
      </div>

      <Popup visible={iosSteps} onMaskClick={() => setIosSteps(false)} showCloseButton onClose={() => setIosSteps(false)}>
        <div style={{ padding: '24px 20px 36px' }}>
          <h2 className="h1">Add {APP_NAME} to your Home Screen</h2>
          <p className="muted">Safari doesn’t show an install button, so it takes three taps:</p>
          <Steps direction="vertical" current={3}>
            <Steps.Step status="process" title="Tap Share" description={<span className="row" style={{ gap: 4 }}>The <UploadOutline /> icon in Safari’s toolbar</span>} />
            <Steps.Step status="process" title="Choose “Add to Home Screen”" description="Scroll the share sheet if you don’t see it" />
            <Steps.Step status="process" title="Tap Add" description={<span className="row" style={{ gap: 4 }}>Open {APP_NAME} from its icon <SendOutline /></span>} />
          </Steps>
          <Button block color="primary" size="large" onClick={() => setIosSteps(false)}>Got it</Button>
        </div>
      </Popup>

      <Popup visible={androidSteps} onMaskClick={() => setAndroidSteps(false)} showCloseButton onClose={() => setAndroidSteps(false)}>
        <div style={{ padding: '24px 20px 36px' }}>
          <h2 className="h1">Install {APP_NAME} from Chrome</h2>
          <p className="muted">Chrome didn’t offer the install pop-up this time, so add it from the menu:</p>
          <Steps direction="vertical" current={3}>
            <Steps.Step status="process" title="Tap ⋮" description="The three-dot menu at the top right of Chrome" />
            <Steps.Step status="process" title="Choose “Install app”" description="On some phones it’s called “Add to Home screen”" />
            <Steps.Step status="process" title="Tap Install" description={<span className="row" style={{ gap: 4 }}>Open {APP_NAME} from its icon <SendOutline /></span>} />
          </Steps>
          <Button block color="primary" size="large" onClick={() => setAndroidSteps(false)}>Got it</Button>
        </div>
      </Popup>
    </div>
  )
}
