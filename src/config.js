// Rename the app here — everything reads from this file.
export const APP_NAME = 'Handi'
export const APP_WORDMARK = 'handi'
export const APP_TAGLINE = 'Home kitchens of your society, one door away.'

// Temporary phone login: every number "gets" this code.
export const DEMO_OTP = '123456'

// The backend has no login yet: after the OTP, the app signs in as this user (a users.user_id).
// Set it in .env.local (see .env.example).
export const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID ?? ''

// Prototype only: how fast a placed order moves Paid → Received → Cooking → Ready.
export const STATUS_STEP_MS = 15000

// Live orders closing within this many minutes are highlighted.
export const CLOSING_SOON_MIN = 30
