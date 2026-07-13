import { t } from '../i18n'

export const ACTIVITY_TYPES = ['WALK', 'PLAY', 'EXERCISE', 'GROOMING', 'OUTING', 'OTHER']

export function activityLabel(type) {
  switch (type) {
    case 'WALK': return t('Walk')
    case 'PLAY': return t('Play')
    case 'EXERCISE': return t('Exercise')
    case 'GROOMING': return t('Grooming')
    case 'OUTING': return t('Outing')
    default: return t('Other')
  }
}
