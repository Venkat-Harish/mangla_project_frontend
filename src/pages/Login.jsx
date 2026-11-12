import { useState } from 'react'
import { Button, Form, Grid, Image, Input, NoticeBar, PasscodeInput, Popup, Toast } from 'antd-mobile'
import { PhonebookOutline } from 'antd-mobile-icons'
import { APP_TAGLINE, APP_WORDMARK } from '../config.js'
import { kitchens } from '../data/mock.js'
import { requestOtp, tenDigits, verifyOtp } from '../services/auth.js'
import { useAuth, useMyKitchen } from '../store/index.js'
import { useCook } from '../store/cook.js'
import { seedPilotMenu } from '../lib/myKitchen.js'

// Keep 10 digits; tolerate spaces and a pasted +91 / 91 prefix.
const phoneDigits = (v) => { const d = v.replace(/\D/g, ''); return d.length > 10 && d.startsWith('91') ? d.slice(-10) : d.slice(0, 10) }

export default function Login() {
  const login = useAuth((s) => s.login)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpOpen, setOtpOpen] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    const res = await requestOtp(phone)
    setBusy(false); setSentTo(res.sentTo); setCode(''); setError(false); setPhoneOpen(false); setOtpOpen(true)
  }

  const verify = async (value = code) => {
    if (value.length < 6) return
    setBusy(true)
    try {
      const { user, kitchen } = await verifyOtp(value, phone)
      if (kitchen) {
        // A pilot cook: open their own kitchen in Cook mode.
        const mine = useMyKitchen.getState()
        if (mine.kitchen?.id === kitchen.id) mine.update(kitchen)
        else { useCook.getState().clearAll(); mine.register(kitchen) }
        mine.setMode('cook')
        seedPilotMenu()
      }
      Toast.show({ icon: 'success', content: `Welcome, ${user.name.split(' ')[0]}` })
      login(user)
    } catch (e) {
      setError(true); Toast.show({ icon: 'fail', content: e.message })
    } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '48px 24px 32px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <img className="brand-logo" src="/logo.svg" alt="" width={64} height={64} />
      <h1 className="serif" style={{ fontSize: 44, lineHeight: '48px', margin: '14px 0 6px' }}>{APP_WORDMARK}</h1>
      <p className="italic muted" style={{ fontSize: 18, lineHeight: '24px', margin: 0, maxWidth: 280 }}>{APP_TAGLINE}</p>

      <Grid columns={3} gap={10} style={{ margin: '28px 0' }}>
        {kitchens.slice(0, 6).map((k) => (
          <Grid.Item key={k.id}><Image src={k.thumb} fit="cover" style={{ aspectRatio: '1', borderRadius: 14 }} /></Grid.Item>
        ))}
      </Grid>

      <div className="caps" style={{ marginBottom: 12 }}>Sign in to your society</div>
      <div className="stack">
        <Button block size="large" color="primary" onClick={() => setPhoneOpen(true)}>
          <span className="row" style={{ justifyContent: 'center' }}><PhonebookOutline /> Continue with phone</span>
        </Button>
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 18 }}>
        Only verified residents can cook or order. Your flat number never leaves your society.
      </p>

      {/* Phone number */}
      <Popup visible={phoneOpen} onMaskClick={() => setPhoneOpen(false)} showCloseButton onClose={() => setPhoneOpen(false)}>
        <div style={{ padding: '24px 20px 32px' }}>
          <h2 className="h2">Your mobile number</h2>
          <p className="muted" style={{ marginTop: 6 }}>Use the number registered with your society office. We’ll text a 6-digit code.</p>
          <Form layout="horizontal" style={{ '--border-top': 'none', '--border-bottom': 'none', margin: '8px -12px' }}>
            <Form.Item label="+91">
              <Input type="tel" inputMode="numeric" placeholder="98765 43210" value={phone} onChange={(v) => setPhone(phoneDigits(v))} clearable autoFocus />
            </Form.Item>
          </Form>
          <Button block size="large" color="primary" disabled={tenDigits(phone).length !== 10} loading={busy} onClick={start}>
            Send code
          </Button>
        </div>
      </Popup>

      {/* OTP — prototype: always 123456 */}
      <Popup visible={otpOpen} onMaskClick={() => setOtpOpen(false)} showCloseButton onClose={() => setOtpOpen(false)} destroyOnClose>
        <div style={{ padding: '24px 20px 32px' }} className="stack">
          <div className="caps">Via SMS</div>
          <h2 className="h1">Enter the 6-digit code</h2>
          <p className="muted" style={{ margin: 0 }}>Sent to {sentTo}.</p>
          <PasscodeInput
            length={6} plain seperated value={code} error={error}
            onChange={(v) => { setCode(v); setError(false) }}
            onFill={(v) => verify(v)}
            style={{ '--cell-size': '46px', '--cell-gap': '8px', margin: '8px 0' }}
          />
          <NoticeBar color="info" content="Prototype: the code is always 123456 — paste it in one go." wrap />
          <Button block size="large" color="primary" loading={busy} disabled={code.length < 6} onClick={() => verify()}>
            Verify & continue
          </Button>
        </div>
      </Popup>
    </div>
  )
}
