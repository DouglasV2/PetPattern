import { t } from '../i18n'

export function trialStatusLabel(status) {
  switch (status) {
    case 'ACTIVE': return t('In progress')
    case 'REINTRODUCED': return t('Reintroducing')
    case 'COMPLETED': return t('Done')
    case 'ABANDONED': return t('Stopped')
    default: return status
  }
}

export function trialTone(status) {
  switch (status) {
    case 'ACTIVE': return 'vet'
    case 'REINTRODUCED': return 'watch'
    case 'COMPLETED': return 'calm'
    default: return 'muted'
  }
}
