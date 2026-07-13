import { useEffect, useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'

function VetShareCard({ pet }) {
  const [status, setStatus] = useState(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  // Link management is the primary owner's; a caregiver gets 404 on status,
  // so the whole card quietly disappears for them.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    api.getVetShare(pet.id)
      .then((s) => { if (alive) setStatus(s) })
      .catch(() => { if (alive) setHidden(true) })
    return () => { alive = false }
  }, [pet.id])

  if (hidden) return null

  function linkFor(token) {
    return `${window.location.origin}/#shared=${token}`
  }

  async function createLink() {
    setBusy(true)
    try {
      const s = await api.createVetShare(pet.id)
      setStatus({ active: true, expiresAt: s.expiresAt })
      setUrl(linkFor(s.token))
    } catch (err) {
      // leave as-is
    } finally {
      setBusy(false)
    }
  }

  async function revokeLink() {
    if (!window.confirm(t('Turn off this link? Anyone who has it will lose access.'))) return
    setBusy(true)
    try {
      await api.revokeVetShare(pet.id)
      setStatus({ active: false })
      setUrl('')
    } catch (err) {
      // leave as-is
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (err) {
      setCopied(false)
    }
  }

  return (
    <div className="context-cta no-print vet-share">
      <div className="panel-heading">
        <Share2 size={18} />
        <h2>{t('Share with your vet')}</h2>
      </div>
      <p className="muted">{t('Create a private link to this summary. It is read-only, expires in 90 days, and you can turn it off anytime.')}</p>

      {url && (
        <div className="share-link-row">
          <input className="share-link" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="secondary-button" type="button" onClick={copyLink}>
            <Copy size={16} /> {copied ? t('Copied') : t('Copy link')}
          </button>
        </div>
      )}

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={createLink} disabled={busy}>
          <Share2 size={16} /> {status?.active && !url ? t('Create a new link') : t('Create a link')}
        </button>
        {status?.active && (
          <button className="ghost-button" type="button" onClick={revokeLink} disabled={busy}>
            {t('Turn off sharing')}
          </button>
        )}
      </div>
      {status?.active && !url && (
        <p className="muted">{t('A link is active. Create a new one to see and copy it (the old one stops working).')}</p>
      )}
    </div>
  )
}

export { VetShareCard }
