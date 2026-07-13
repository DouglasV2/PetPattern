import { t } from '../../i18n'
import { QuickChoices } from '../../components/QuickChoices'

// One QuickChoices control per guided token. Option lists mirror the full form's
// (kept here so the guided flow is self-contained); the full form is canonical.
function GuidedChoice({ token, form, setForm }) {
  switch (token) {
    case 'itching':
      return <QuickChoices label={t('Scratching / itching')} value={form.itchingScore} options={[0, 2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }))} onChange={(itchingScore) => setForm({ ...form, itchingScore })} />
    case 'stool':
      return <QuickChoices label={t('Stool')} value={form.stoolState} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'SOFT', label: t('Soft') }, { value: 'DIARRHEA', label: t('Diarrhea') }, { value: 'NO_STOOL', label: t('No stool') }]} onChange={(stoolState) => setForm({ ...form, stoolState })} />
    case 'litter':
      return <QuickChoices label={t('Litter box')} value={form.litterBoxUse} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LESS', label: t('Less') }, { value: 'MORE', label: t('More') }, { value: 'NONE', label: t('Not used') }]} onChange={(litterBoxUse) => setForm({ ...form, litterBoxUse })} />
    case 'urination':
      return <QuickChoices label={t('Urination change')} value={form.urinationChange} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LESS', label: t('Less') }, { value: 'MORE', label: t('More') }]} onChange={(urinationChange) => setForm({ ...form, urinationChange })} />
    case 'appetite':
      return <QuickChoices label={t('Appetite')} value={form.appetiteLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOWER', label: t('Lower') }, { value: 'HIGHER', label: t('Higher') }, { value: 'REFUSED', label: t('Refused') }]} onChange={(appetiteLevel) => setForm({ ...form, appetiteLevel })} />
    case 'water':
      return <QuickChoices label={t('Water')} value={form.waterLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOWER', label: t('Lower') }, { value: 'HIGHER', label: t('Higher') }]} onChange={(waterLevel) => setForm({ ...form, waterLevel })} />
    case 'energy':
      return <QuickChoices label={t('Energy')} value={form.energyLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOW', label: t('Low') }, { value: 'RESTLESS', label: t('Restless') }, { value: 'HIGH', label: t('High') }]} onChange={(energyLevel) => setForm({ ...form, energyLevel })} />
    default:
      return null
  }
}

export { GuidedChoice }
