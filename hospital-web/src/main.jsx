import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// Register PWA service worker
registerSW({ immediate: true })

import { AppointmentProvider } from './context/AppointmentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppointmentProvider>
      <App />
    </AppointmentProvider>
  </StrictMode>,
)
