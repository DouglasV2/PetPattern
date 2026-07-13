import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { t } from '../i18n'

// A brief, self-dismissing confirmation that floats above the record. Announced
// politely to assistive tech and dismissable early with the close button. It owns
// its own auto-dismiss timer so it can pause while hovered or keyboard-focused —
// otherwise the 3.2s timeout could yank the close button out from under a
// keyboard user and drop their focus to <body>.
function Toast({ message, onDismiss }) {
  const [paused, setPaused] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  useEffect(() => {
    if (paused) return undefined
    const id = setTimeout(() => dismissRef.current(), 3200)
    return () => clearTimeout(id)
  }, [paused])
  return (
    <div className="toast" role="status" aria-live="polite"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="toast-icon"><Check size={15} /></span>
      <span className="toast-text">{message}</span>
      <button className="toast-close" type="button" aria-label={t('Dismiss')} onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  )
}

export { Toast }
