import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ClaimQR from './pages/ClaimQR'
import './index.css'

// External claim links: /claim/:requestId
// Any AI agent (Claude, GPT, WhatsApp bot...) sends users here to show the QR
const claimMatch = window.location.pathname.match(/^\/claim\/([a-zA-Z0-9_-]+)$/)
const tradeDetailMatch = window.location.pathname.match(/^\/trade\/([a-f0-9-]{36})$/i)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {claimMatch ? (
      <ClaimQR requestId={claimMatch[1]} />
    ) : (
      <App initialTradeId={tradeDetailMatch?.[1] ?? null} />
    )}
  </React.StrictMode>,
)
