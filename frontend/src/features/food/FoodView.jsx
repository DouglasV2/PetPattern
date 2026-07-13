import { ArrowLeft, Check, FlaskConical, Search, Trash2 } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { foodKindLabel, proteinLabel, proteinOptions } from '../../lib/food'
import { QuickChoices } from '../../components/QuickChoices'
import { ToggleButton } from '../../components/ToggleButton'
import { DateField } from '../../components/DateField'

function FoodView({ pet, form, setForm, saving, foodLogs, onBack, onSave, onDeleteFood, onTrial, onFoodDetective }) {
  function toggleSecondary(protein) {
    const exists = form.secondaryProteins.includes(protein)
    setForm({
      ...form,
      secondaryProteins: exists
        ? form.secondaryProteins.filter((item) => item !== protein)
        : [...form.secondaryProteins, protein]
    })
  }

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Food & treats')}</p>
      <h1>{t('{name} · food', { name: pet.name })}</h1>
      <p className="lead">{t('Food changes often matter more than they seem. Track the first day {name} ate it.', { name: pet.name })}</p>

      <form className="quick-form" onSubmit={onSave}>
        <QuickChoices
          label={t('Food kind')}
          value={form.foodKind}
          options={[
            { value: 'MAIN_FOOD', label: t('Main food') },
            { value: 'TREAT', label: t('Treat') },
            { value: 'SUPPLEMENT', label: t('Supplement') },
            { value: 'OTHER', label: t('Other') }
          ]}
          onChange={(foodKind) => setForm({ ...form, foodKind })}
        />

        <div className="two-fields">
          <label className="field-label">
            {t('Brand')}
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </label>
          <label className="field-label">
            {t('Product')}
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </label>
        </div>

        <QuickChoices
          label={t('Main ingredient')}
          value={form.primaryProtein}
          options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
          onChange={(primaryProtein) => setForm({ ...form, primaryProtein })}
        />

        <div className="choice-block">
          <span>{t('Other ingredients')}</span>
          <div className="choice-grid">
            {proteinOptions.filter((protein) => protein !== form.primaryProtein).map((protein) => (
              <button key={protein} type="button" aria-pressed={form.secondaryProteins.includes(protein)} className={form.secondaryProteins.includes(protein) ? 'choice-button active' : 'choice-button'} onClick={() => toggleSecondary(protein)}>
                {proteinLabel(protein)}
              </button>
            ))}
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleButton active={form.grainFree} label={t('Grain-free')} onClick={() => setForm({ ...form, grainFree: !form.grainFree })} />
          <ToggleButton active={form.newFood} label={t('New food')} onClick={() => setForm({ ...form, newFood: !form.newFood })} />
        </div>

        <div className="field-label">
          {t('Date started')}
          <DateField value={form.dateStarted} label={t('Date started')} onChange={(d) => setForm({ ...form, dateStarted: d })} />
        </div>

        <label className="field-label">
          {t('Notes')}
          <textarea placeholder={t('First serving, treat size, reason for the change…')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> {t('Save food change')}
        </button>
      </form>

      {foodLogs?.length > 0 && (
        <div className="food-history">
          <p className="form-section-label">{t('Recent food changes')}</p>
          <ul className="food-history-list">
            {foodLogs.slice(0, 8).map((food) => (
              <li key={food.id}>
                <div className="food-history-main">
                  <strong>{formatDate(food.dateStarted)}</strong>{' '}
                  {[food.brand, food.productName].filter(Boolean).join(' - ') || foodKindLabel(food.foodKind)}
                  <span className="muted"> · {proteinLabel(food.primaryProtein)}{food.newFood ? ` · ${t('new')}` : ''}</span>
                </div>
                <button className="icon-button danger" type="button" aria-label={`Delete food entry from ${formatDate(food.dateStarted)}`} onClick={() => onDeleteFood(food)}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onFoodDetective && (
        <div className="context-cta">
          <p className="muted">{t('Wondering if a food change lines up with a change in how {name} felt?', { name: pet.name })}</p>
          <button className="secondary-button" type="button" onClick={onFoodDetective}>
            <Search size={18} /> {t('See food timeline')}
          </button>
        </div>
      )}

      <div className="context-cta">
        <p className="muted">{t('Already changing food with your vet? You can note when a change started and keep watching how {name} does.', { name: pet.name })}</p>
        <button className="secondary-button" type="button" onClick={onTrial}>
          <FlaskConical size={18} /> {t('Track a food change')}
        </button>
      </div>
    </section>
  )
}

export { FoodView }
