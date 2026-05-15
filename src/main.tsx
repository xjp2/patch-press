import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadImageMap } from './lib/utils'

// Preload image map so fixImagePath can convert Supabase URLs to local CDN paths
loadImageMap().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
