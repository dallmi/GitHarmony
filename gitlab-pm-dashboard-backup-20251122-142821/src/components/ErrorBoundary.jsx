import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary: Error caught:', error)
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary: Component error details:', {
      error: error.toString(),
      errorInfo,
      componentStack: errorInfo.componentStack
    })
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      console.log('ErrorBoundary: Rendering error UI')

      return (
        <div style={{
          padding: '40px',
          fontFamily: 'sans-serif',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{ color: '#DC2626' }}>Something went wrong</h1>
          <h2>Error Details:</h2>
          <pre style={{
            background: '#FEE2E2',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
            fontSize: '14px'
          }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#E60000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Reload Page
          </button>

          <p style={{ marginTop: '20px', color: '#6B7280' }}>
            Please open the browser console (F12) and share the error details with the developer.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
