import { t } from '../../i18n'
import { ToggleButton } from '../../components/ToggleButton'

// One ToggleButton per guided flag token.
function GuidedToggle({ token, form, setForm }) {
  switch (token) {
    case 'vomiting':
      return <ToggleButton active={form.vomiting} label={t('Vomiting')} onClick={() => setForm({ ...form, vomiting: !form.vomiting })} />
    case 'earRedness':
      return <ToggleButton active={form.earRedness} label={t('Ear redness')} onClick={() => setForm({ ...form, earRedness: !form.earRedness })} />
    case 'pawLicking':
      return <ToggleButton active={form.pawLicking} label={t('Paw licking')} onClick={() => setForm({ ...form, pawLicking: !form.pawLicking })} />
    case 'straining':
      return <ToggleButton active={form.straining} label={t('Straining')} onClick={() => setForm({ ...form, straining: !form.straining })} />
    case 'hiding':
      return <ToggleButton active={form.hidingBehavior === 'MORE'} label={t('Hiding more')} onClick={() => setForm({ ...form, hidingBehavior: form.hidingBehavior === 'MORE' ? 'NORMAL' : 'MORE' })} />
    case 'weight':
      return <ToggleButton active={form.weightConcern} label={t('Weight concern')} onClick={() => setForm({ ...form, weightConcern: !form.weightConcern })} />
    default:
      return null
  }
}

export { GuidedToggle }
