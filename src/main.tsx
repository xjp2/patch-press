import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AnalyticsProvider } from './components/AnalyticsProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AnalyticsProvider>
        <App />
      </AnalyticsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
