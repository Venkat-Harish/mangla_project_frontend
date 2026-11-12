import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import './styles/theme.css'
import './hooks/index.js' // attaches the beforeinstallprompt listener at boot
import App from './App.jsx'
import { useAuth, useMyKitchen } from './store/index.js'
import { seedPilotMenu } from './lib/myKitchen.js'

// Pilot cooks always open the app in Cook mode (they can switch to Eat mode in Profile),
// and pick up any dishes added to their menu in src/data/cooks.js since last time.
if (useAuth.getState().user?.kitchenId && useMyKitchen.getState().kitchen) {
  useMyKitchen.getState().setMode('cook')
  seedPilotMenu()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
