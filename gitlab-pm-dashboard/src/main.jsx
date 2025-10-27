import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

console.log('=== GitLab PM Dashboard - Starting ===')
console.log('Environment:', {
  protocol: window.location.protocol,
  pathname: window.location.pathname,
  userAgent: navigator.userAgent,
  reactVersion: StrictMode ? 'React 18+' : 'Unknown'
})

try {
  console.log('Step 1: Looking for root element...')
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    console.error('ERROR: Root element not found!')
    document.body.innerHTML = '<div style="padding: 40px; font-family: sans-serif;"><h1>Error: Root element missing</h1><p>Cannot find element with id="root"</p></div>'
    throw new Error('Root element not found')
  }

  console.log('Step 2: Root element found:', rootElement)
  console.log('Step 3: Creating React root...')

  const root = createRoot(rootElement)
  console.log('Step 4: React root created successfully')

  console.log('Step 5: Rendering App component with ErrorBoundary...')
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )

  console.log('✅ App rendered successfully!')

} catch (error) {
  console.error('❌ FATAL ERROR during initialization:', error)
  console.error('Error stack:', error.stack)

  // Show error on page
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="color: #DC2626;">GitLab PM Dashboard - Initialization Error</h1>
      <h2>Error Details:</h2>
      <pre style="background: #FEE2E2; padding: 16px; border-radius: 8px; overflow-x: auto;">${error.message}\n\n${error.stack}</pre>
      <h2>Debug Information:</h2>
      <pre style="background: #F3F4F6; padding: 16px; border-radius: 8px; overflow-x: auto;">${JSON.stringify({
        protocol: window.location.protocol,
        pathname: window.location.pathname,
        userAgent: navigator.userAgent
      }, null, 2)}</pre>
      <p>Please check the browser console (F12) for more details and share this with the developer.</p>
    </div>
  `
}
