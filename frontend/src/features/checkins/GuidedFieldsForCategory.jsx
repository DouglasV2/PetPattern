import { Pill, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { guidedTokens } from '../../lib/checkins'
import { GuidedChoice } from './GuidedChoice'
import { GuidedToggle } from './GuidedToggle'

// Renders just the fields the selected "what changed?" categories map to, plus a
// food / medication CTA when those categories are picked.
function GuidedFieldsForCategory({ categories, cat, form, setForm, onAddFood, onAddMedication, note }) {
  const tokens = guidedTokens(categories, cat)
  const choiceOrder = ['itching', 'stool', 'litter', 'urination', 'appetite', 'water', 'energy']
  const toggleOrder = ['vomiting', 'earRedness', 'pawLicking', 'straining', 'hiding', 'weight']
  const toggles = toggleOrder.filter((tk) => tokens.has(tk))
  return (
    <>
      {choiceOrder.filter((tk) => tokens.has(tk)).map((tk) => (
        <GuidedChoice key={tk} token={tk} form={form} setForm={setForm} />
      ))}
      {toggles.length > 0 && (
        <div className="toggle-grid">
          {toggles.map((tk) => <GuidedToggle key={tk} token={tk} form={form} setForm={setForm} />)}
        </div>
      )}
      {categories.includes('food') && (
        <button type="button" className="ghost-button wide" onClick={() => onAddFood(null, note)}>
          <Utensils size={18} /> {t('Add a food or treat change')}
        </button>
      )}
      {categories.includes('medication') && (
        <button type="button" className="ghost-button wide" onClick={onAddMedication}>
          <Pill size={18} /> {t('Add a medication or care note')}
        </button>
      )}
    </>
  )
}

export { GuidedFieldsForCategory }
