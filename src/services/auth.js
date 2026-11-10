// Temporary login. MyGate / Google / phone all "send" the same demo OTP.
// When going live, replace requestOtp/verifyOtp with the real MyGate flow.
import { DEMO_OTP } from '../config.js'
import { demoUser } from '../data/mock.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const PROVIDERS = {
  mygate: { label: 'MyGate', sentTo: 'the MyGate app linked to your flat' },
  google: { label: 'Google', sentTo: 'your Gmail inbox' },
  phone: { label: 'Phone', sentTo: 'your phone by SMS' },
}

export async function requestOtp(provider, contact) {
  await wait(400)
  const p = PROVIDERS[provider]
  return { sentTo: provider === 'phone' && contact ? `+91 ${contact}` : p.sentTo }
}

export async function verifyOtp(provider, code, contact) {
  await wait(500)
  if (code !== DEMO_OTP) throw new Error('That code doesn’t match. Try 123456.')
  return { ...demoUser, via: provider, phone: provider === 'phone' && contact ? `+91 ${contact}` : demoUser.phone }
}
