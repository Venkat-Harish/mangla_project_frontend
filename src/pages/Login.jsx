import { useState } from 'react'
import { Button, Form, Grid, Image, Input, NoticeBar, PasscodeInput, Popup, Toast } from 'antd-mobile'
import { CheckShieldOutline, MailOutline, PhonebookOutline } from 'antd-mobile-icons'
import { APP_TAGLINE, APP_WORDMARK } from '../config.js'
import { kitchens } from '../data/mock.js'
import { PROVIDERS, requestOtp, verifyOtp } from '../services/auth.js'
import { useAuth } from '../store/index.js'

export default function Login() {
  const login = useAuth((s) => s.login)
  const [provider, setProvider] = useState(null)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpOpen, setOtpOpen] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const start = async (p, contact) => {
    setBusy(true); setProvider(p)
    const res = await requestOtp(p, contact)
    setBusy(false); setSentTo(res.sentTo); setCode(''); setError(false); setPhoneOpen(false); setOtpOpen(true)
  }

  const verify = async (value = code) => {
    if (value.length < 6) return
    setBusy(true)
    try {
      const user = await verifyOtp(provider, value, phone)
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
        {kitchens.slice(0, 3).map((k) => (
          <Grid.Item key={k.id}><Image src={k.thumb} fit="cover" height={92} style={{ borderRadius: 14 }} /></Grid.Item>
        ))}
      </Grid>

      <div className="caps" style={{ marginBottom: 12 }}>Sign in to your society</div>
      <div className="stack">
        <Button block size="large" color="primary" loading={busy && provider === 'mygate'} onClick={() => start('mygate')}>
          <span className="row" style={{ justifyContent: 'center' }}><CheckShieldOutline /> Continue with MyGate</span>
        </Button>
        <Button block size="large" onClick={() => start('google')} loading={busy && provider === 'google'}>
          <span className="row" style={{ justifyContent: 'center' }}><MailOutline /> Continue with Google</span>
        </Button>
        <Button block size="large" onClick={() => setPhoneOpen(true)}>
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
              <Input type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={setPhone} clearable autoFocus />
            </Form.Item>
          </Form>
          <Button block size="large" color="primary" disabled={phone.replace(/\D/g, '').length !== 10} loading={busy} onClick={() => start('phone', phone)}>
            Send code
          </Button>
        </div>
      </Popup>

      {/* OTP — temporary until MyGate login goes live */}
      <Popup visible={otpOpen} onMaskClick={() => setOtpOpen(false)} showCloseButton onClose={() => setOtpOpen(false)} destroyOnClose>
        <div style={{ padding: '24px 20px 32px' }} className="stack">
          <div className="caps">Via {provider && PROVIDERS[provider].label}</div>
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
