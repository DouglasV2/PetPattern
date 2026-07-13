import { ArrowLeft, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { speciesProfile } from '../../speciesProfiles'
import { addDays, formatDate, parseLocalDate } from '../../lib/date'
import { foodDetectiveSignals, foodKindLabel, proteinLabel } from '../../lib/food'

// A transparent timeline: each food/treat change with the notable check-in signals
// logged within the following week. It lines things up — it never claims a cause.
function FoodDetectiveView({ pet, foodLogs, checkIns, onBack, onFoodChange }) {
  const profile = speciesProfile(pet.species)
  const environment = profile.detectiveMode === 'ENVIRONMENT'
  const hasData = foodLogs?.length > 0 && checkIns?.length > 0
  const byDateAsc = [...(checkIns || [])].sort((a, b) => (a.checkInDate < b.checkInDate ? -1 : 1))
  const entries = [...(foodLogs || [])]
    .sort((a, b) => (a.dateStarted < b.dateStarted ? 1 : -1))
    .slice(0, 12)
    .map((food) => {
      const start = food.dateStarted
      const end = addDays(start, 7)
      const nearby = byDateAsc
        .filter((c) => c.checkInDate >= start && c.checkInDate <= end)
        .flatMap((c) => {
          const n = Math.round((parseLocalDate(c.checkInDate) - parseLocalDate(start)) / 86400000)
          return foodDetectiveSignals(c, pet.species).map((sig) => ({ n, sig }))
        })
        .slice(0, 8)
      return { food, nearby }
    })

  return (
    <section className="flow-panel food-detective">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Timeline')}</p>
      <h1>{environment ? t('Environment detective') : t('Food detective')}</h1>
      <p className="lead">{environment
        ? t('See whether appetite, activity, droppings or other changes often happen near a care or environment change.')
        : t('See whether stool, scratching, appetite, vomiting, or energy changes often happen near food or treat changes.')}</p>
      <p className="pattern-disclaimer muted">{environment
        ? t('PetPattern lines up care or environment changes with later observations. This is not a diagnosis.')
        : t('This is not an allergy diagnosis. It is a timeline you can discuss with your vet.')}</p>

      {!hasData ? (
        <article className="panel">
          <p className="muted">{t('Add a food or treat change and a few check-ins. PetPattern will line them up here.')}</p>
        </article>
      ) : (
        <div className="detective-list">
          {entries.map(({ food, nearby }) => (
            <article className="panel detective-entry" key={food.id}>
              <div className="detective-head">
                <strong>{formatDate(food.dateStarted)}</strong>
                <span className="detective-food">{[food.brand, food.productName].filter(Boolean).join(' - ') || foodKindLabel(food.foodKind)}</span>
                <div className="chip-row">
                  <span className="chip">{proteinLabel(food.primaryProtein)}</span>
                  <span className="chip">{foodKindLabel(food.foodKind)}</span>
                  {food.newFood && <span className="chip alert">{t('New')}</span>}
                </div>
              </div>
              {nearby.length > 0 ? (
                <ul className="detective-signals">
                  {nearby.map((row, idx) => (
                    <li key={idx}>
                      <span className="detective-when">{row.n <= 0 ? t('Same day') : row.n === 1 ? t('1 day after') : t('{n} days after', { n: row.n })}</span>
                      <span className="detective-sig">{row.sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t('Nothing notable was logged in the week after this change.')}</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="context-cta">
        <p className="muted">{t('These signals were logged near a change — worth mentioning to your vet, not a proven cause.')}</p>
        <button className="secondary-button" type="button" onClick={onFoodChange}>
          <Utensils size={18} /> {t('Add food change')}
        </button>
      </div>
    </section>
  )
}

export { FoodDetectiveView }
