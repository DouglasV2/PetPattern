import { Pill, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { categoryOptions } from '../../speciesProfiles'
import { QuickChoices } from '../../components/QuickChoices'

// Generic value-selectors for a STARTER species' guided categories. Each choice is
// written into form.observations (serialized to observationsJson on save), so a
// rabbit/bird/reptile logs its own signals — never the dog/cat columns. Categories
// flagged as food/medication route to those existing flows instead of a field.
function StarterGuidedFields({ categories, form, setForm, note, onAddFood, onAddMedication }) {
  function setValue(cat, value) {
    const prev = (form.observations || {})[cat.key] || {}
    setForm({ ...form, observations: { ...(form.observations || {}), [cat.key]: { label: cat.label, ...prev, value } } })
  }
  return (
    <>
      {categories.map((cat) => {
        if (cat.cta === 'food') {
          return (
            <button key={cat.key} type="button" className="ghost-button wide" onClick={() => onAddFood(null, note)}>
              <Utensils size={18} /> {t('Add a food or treat change')}
            </button>
          )
        }
        if (cat.cta === 'medication') {
          return (
            <button key={cat.key} type="button" className="ghost-button wide" onClick={onAddMedication}>
              <Pill size={18} /> {t('Add a medication or care note')}
            </button>
          )
        }
        const current = (form.observations || {})[cat.key] || {}
        return (
          <QuickChoices
            key={cat.key}
            label={t(cat.label)}
            value={current.value || ''}
            options={categoryOptions(cat).map((o) => ({ value: o, label: t(o) }))}
            onChange={(value) => setValue(cat, value)}
          />
        )
      })}
    </>
  )
}

export { StarterGuidedFields }
