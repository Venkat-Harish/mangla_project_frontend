import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Form, ImageUploader, Input, NavBar, Result, Toast } from 'antd-mobile'
import { EnvironmentOutline } from 'antd-mobile-icons'
import { api } from '../services/api.js'
import { useAuth, useMyKitchen } from '../store/index.js'
import { shrinkImage } from '../lib/format.js'

const tenDigits = (phone = '') => phone.replace(/\D/g, '').slice(-10)

export default function RegisterKitchen() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const { kitchen, register, update, setMode } = useMyKitchen()
  const editing = !!kitchen
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const logo = Form.useWatch('logo', form)
  const name = Form.useWatch('name', form)

  const submit = async (values) => {
    setSaving(true)
    const data = { name: values.name.trim(), phone: '+91 ' + tenDigits(values.phone), logo: values.logo[0].url }
    try {
      if (editing) {
        update(await api.updateKitchen(data))
        Toast.show({ icon: 'success', content: 'Kitchen updated' })
        navigate(-1)
      } else {
        const created = await api.registerKitchen(data)
        register(created)
        setDone(created)
      }
    } finally { setSaving(false) }
  }

  if (done) {
    return (
      <div className="pad" style={{ paddingTop: 40, textAlign: 'center' }}>
        <Avatar src={done.logo} style={{ '--size': '96px', '--border-radius': '50%', margin: '0 auto' }} />
        <Result status="success" title="Your kitchen is registered" description={<><b>{done.name}</b><br />Switch to Cook mode whenever you’re ready to cook for your neighbours.</>} style={{ background: 'transparent' }} />
        <div className="stack">
          <Button block size="large" color="primary" onClick={() => { setMode('cook'); Toast.show({ content: 'Cook mode on' }); navigate('/cook', { replace: true }) }}>Switch to Cook mode</Button>
          <Button block size="large" onClick={() => navigate('/settings', { replace: true })}>Stay in Eat mode</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavBar onBack={() => navigate(-1)}>{editing ? 'Edit kitchen' : 'Register your kitchen'}</NavBar>

      <div className="pad" style={{ paddingTop: 18 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="story-ring">
            <Avatar src={logo?.[0]?.url ?? ''} style={{ '--size': '62px', '--border-radius': '50%' }} />
          </span>
          <div>
            <div className="h2">{name?.trim() || 'Your kitchen'}</div>
            <div className="muted" style={{ fontSize: 12 }}>This is how neighbours will see you on Home.</div>
          </div>
        </div>
      </div>

      <Form
        form={form} layout="vertical" onFinish={submit} requiredMarkStyle="none" style={{ marginTop: 8 }}
        initialValues={{ name: kitchen?.name ?? '', phone: tenDigits(kitchen?.phone ?? user.phone), logo: kitchen ? [{ url: kitchen.logo }] : [] }}
        footer={<Button block type="submit" color="primary" size="large" loading={saving}>{editing ? 'Save changes' : 'Register kitchen'}</Button>}
      >
        <Form.Item name="name" label="Display name" description="What neighbours see on Home and in stories."
          rules={[{ required: true, message: 'Give your kitchen a name' }, { min: 3, max: 40, message: 'Use 3–40 characters' }]}>
          <Input placeholder="e.g. Rohan’s Rasoi" maxLength={40} clearable />
        </Form.Item>

        <Form.Item name="phone" label="Phone number (+91)" description="Buyers can call you about pickups."
          rules={[{ required: true, message: 'Enter a phone number' }, { pattern: /^\d{10}$/, message: 'Enter a 10-digit mobile number' }]}>
          <Input type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210" clearable
            style={{ '--prefix-width': '40px' }} />
        </Form.Item>

        <Form.Item name="logo" label="Logo" description="A square photo works best — your dish, your face, or a logo."
          rules={[{ validator: (_, v) => (v?.length ? Promise.resolve() : Promise.reject(new Error('Add a logo'))) }]}>
          <ImageUploader maxCount={1} upload={async (file) => ({ url: await shrinkImage(file, 400) })} />
        </Form.Item>

        <Form.Item label="Pickup from" disabled>
          <div className="row muted" style={{ gap: 6 }}>
            <EnvironmentOutline /> Flat {user.flat}, Block {user.block}, {user.society}
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}
