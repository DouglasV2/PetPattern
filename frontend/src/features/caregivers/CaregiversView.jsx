import { useEffect, useState } from 'react'
import { ArrowLeft, LogOut, Mail, UserPlus, Users } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'

function CaregiversView({ pet, onBack, onLeft }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | forbidden
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function leave() {
    if (!window.confirm(t('Stop helping with {name}? You can be invited again later.', { name: pet.name }))) return
    setBusy(true)
    setError('')
    try {
      await api.leavePet(pet.id)
      if (onLeft) onLeft()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    setState('loading')
    try {
      setData(await api.listCaregivers(pet.id))
      setState('ready')
    } catch (err) {
      // Only the primary owner can manage the circle; caregivers get a 404 here.
      setState('forbidden')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id])

  async function invite(event) {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError('')
    try {
      await api.inviteCaregiver(pet.id, email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err.message || t('Could not send the invite.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(ownerId) {
    if (!window.confirm(t('Remove this person? They will lose access to {name}.', { name: pet.name }))) return
    setError('')
    try {
      await api.removeCaregiver(pet.id, ownerId)
      await load()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    }
  }

  async function cancel(inviteId) {
    setError('')
    try {
      await api.cancelInvite(pet.id, inviteId)
      await load()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    }
  }

  return (
    <section className="flow-panel">
      <button className="back-button no-print" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> {t('Back to {name} today', { name: pet.name })}
      </button>
      <p className="kicker">{t('Care circle')}</p>
      <h1>{t('Who helps look after {name}', { name: pet.name })}</h1>
      <p className="lead">
        {t('Invite the people who share the day-to-day — a partner, family, a dog walker. They can log and see everything for {name}. Nobody is added until they accept.', { name: pet.name })}
      </p>

      {state === 'loading' && <p className="muted">{t('Just a moment…')}</p>}

      {state === 'forbidden' && (
        <>
          <p className="muted">{t('Only the person who started this profile can manage who helps. You can still log and see everything for {name}.', { name: pet.name })}</p>
          {error && <div className="error-box" role="alert">{error}</div>}
          <div className="action-row">
            <button className="ghost-button" type="button" onClick={leave} disabled={busy}>
              <LogOut size={16} /> {t('Stop helping with {name}', { name: pet.name })}
            </button>
          </div>
        </>
      )}

      {state === 'ready' && data && (
        <>
          <form className="invite-form" onSubmit={invite}>
            <input
              type="email"
              placeholder={t('Their email address')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="secondary-button" type="submit" disabled={busy}>
              <UserPlus size={16} /> {t('Send invite')}
            </button>
          </form>
          {error && <div className="error-box" role="alert">{error}</div>}

          <div className="care-list">
            <div className="panel-heading">
              <Users size={18} />
              <h2>{t('Helping now')}</h2>
            </div>
            {data.caregivers.length === 0 ? (
              <p className="muted">{t('Just you for now.')}</p>
            ) : (
              data.caregivers.map((person) => (
                <div key={person.ownerId} className="care-row">
                  <div className="care-who">
                    <strong>{person.displayName || person.email}</strong>
                    {person.displayName && <span className="muted">{person.email}</span>}
                  </div>
                  <button className="ghost-button" type="button" onClick={() => remove(person.ownerId)}>
                    {t('Remove')}
                  </button>
                </div>
              ))
            )}
          </div>

          {data.invites.length > 0 && (
            <div className="care-list">
              <div className="panel-heading">
                <Mail size={18} />
                <h2>{t('Invited, waiting to join')}</h2>
              </div>
              {data.invites.map((pending) => (
                <div key={pending.id} className="care-row">
                  <div className="care-who">
                    <strong>{pending.email}</strong>
                    <span className="muted">{t('Invited {date}', { date: formatDate(pending.createdAt) })}</span>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => cancel(pending.id)}>
                    {t('Cancel')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export { CaregiversView }
