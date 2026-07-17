import { Component } from 'react'
import { t } from '../i18n'

/**
 * Loading fallback for a lazily-loaded view. Announced politely so a screen reader is told the
 * section is loading rather than sitting on a silent blank area.
 */
function ViewFallback() {
  return (
    <div className="view-loading" role="status" aria-live="polite" aria-busy="true"
         style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#7a7266' }}>
      {t('Loading…')}
    </div>
  )
}

/**
 * Catches failures in the lazily-loaded view area — most importantly a stale dynamic-import chunk
 * 404 after a redeploy — and offers a reload instead of a blank screen. Resets when the active
 * `viewKey` changes, so recovering (or navigating elsewhere) clears the error state.
 */
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('[view] failed to load or render', error)
  }

  componentDidUpdate(prevProps) {
    if (this.state.failed && prevProps.viewKey !== this.props.viewKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="view-error" role="alert" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p>{t('This section could not be loaded. It may have just updated — please reload.')}</p>
          <button className="primary" type="button" onClick={() => window.location.reload()}>
            {t('Reload')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export { ChunkErrorBoundary, ViewFallback }
