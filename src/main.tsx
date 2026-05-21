import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import './auth.css'
import App from './App.tsx'

// ── Service worker update handling ────────────────────────────────────────────
// Wire this up before React renders so the listener is in place before any
// controllerchange event can fire.
if ('serviceWorker' in navigator) {
  // When a new SW takes control, reload once to load fresh assets.
  // The `reloading` flag prevents a loop if controllerchange fires again.
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  // Actively check for a new SW on every page load and every time the user
  // returns to this tab (covers long-lived background tabs).
  navigator.serviceWorker.ready.then(reg => {
    void reg.update()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reg.update()
    })
  }).catch(() => {})
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
