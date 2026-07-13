import { useState } from 'react'
import { Mail } from 'lucide-react'
import { t } from '../../i18n'

function InvitesBanner({ invites, onAccept, onDecline }) {
  // Track the in-flight invite so a double-tap can't fire two accepts (which would
  // race on the caregiver unique constraint server-side).
  const [busyId, setBusyId] = useState(null)

  async function act(fn, id) {
    if (busyId) return
    setBusyId(id)
    try {
      await fn(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="invites-banner no-print">
      {invites.map((invite) => (
        <div key={invite.id} className="invite-row">
          <Mail size={17} />
          <p>
            <strong>{invite.invitedByName}</strong>{' '}
            {t('asked you to help look after {name}.', { name: invite.petName })}
          </p>
          <div className="invite-actions">
            <button className="secondary-button" type="button" disabled={busyId === invite.id} onClick={() => act(onAccept, invite.id)}>
              {t('Join')}
            </button>
            <button className="ghost-button" type="button" disabled={busyId === invite.id} onClick={() => act(onDecline, invite.id)}>
              {t('Not now')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export { InvitesBanner }
