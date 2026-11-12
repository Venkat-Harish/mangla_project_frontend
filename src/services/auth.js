// Temporary phone login: every number "gets" the same demo OTP.
// The pilot cooks' numbers (src/data/cooks.js) sign in to their own kitchen;
// any other number signs in as the demo resident.
import { DEMO_OTP } from '../config.js'
import { demoUser, society } from '../data/mock.js'
import { cookByPhone } from '../data/cooks.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const tenDigits = (phone = '') => phone.replace(/\D/g, '').slice(-10)
export const prettyPhone = (phone) => { const d = tenDigits(phone); return `+91 ${d.slice(0, 5)} ${d.slice(5)}` }
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export async function requestOtp(phone) {
  await wait(400)
  return { sentTo: prettyPhone(phone) }
}

// Resolves to { user, kitchen } — `kitchen` is set only for a pilot cook.
export async function verifyOtp(code, phone) {
  await wait(500)
  if (code !== DEMO_OTP) throw new Error('That code doesn’t match. Try 123456.')
  const cook = cookByPhone(phone)
  if (!cook) return { user: { ...demoUser, phone: prettyPhone(phone), via: 'phone' }, kitchen: null }
  return {
    user: {
      id: 'u-' + cook.id, name: cook.owner, initials: initialsOf(cook.owner),
      flat: cook.flat, block: cook.block, society: society.name,
      phone: prettyPhone(phone), via: 'phone', kitchenId: cook.id,
    },
    kitchen: { id: cook.id, name: cook.name, phone: cook.phone, logo: cook.logo, createdAt: Date.now() },
  }
}
