import { useState } from 'react'
import { ArrowLeft, Copy, Printer, Share2 } from 'lucide-react'
import { t } from '../../i18n'
import { VetStats } from './VetStats'
import { VetShareCard } from './VetShareCard'
import { VetSheet } from './VetSheet'

function VetSummaryView({ pet, summary, loading, days, checkIns, onBack, onChangeDays, onMedications }) {
  const [copied, setCopied] = useState(false)
  // Native share is mostly a phone/tablet capability; on a desktop without it the
  // "Copy summary" button below is the fallback, so we simply hide Share there.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copySummary() {
    if (!summary?.plainText) return
    try {
      await navigator.clipboard.writeText(summary.plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (err) {
      setCopied(false)
    }
  }

  async function shareSummary() {
    if (!summary?.plainText) return
    const title = t('PetPattern summary — {name}', { name: summary.pet?.name || pet.name })
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary.plainText })
      } catch (err) {
        // Share sheet dismissed or failed — cancelling is normal, so do nothing.
      }
    } else {
      copySummary()
    }
  }

  if (loading && !summary) {
    return (
      <section className="flow-panel">
        <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t("Preparing {name}'s summary…", { name: pet.name })}</p>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="flow-panel">
        <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="kicker">{t('Bring this to your vet')}</p>
        <h1>{t('Vet visit summary')}</h1>
        <p className="muted">{t('Nothing to summarise yet. Log a few days and this becomes a clear, shareable note for your vet.')}</p>
      </section>
    )
  }

  return (
    <section className="flow-panel vet-summary">
      <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Bring this to your vet')}</p>
      <h1>{t('Vet visit summary')}</h1>
      <p className="lead">{t('A calm record of what you logged. Built to help a vet conversation, not to diagnose.')}</p>

      <VetStats summary={summary} checkIns={checkIns} />

      <VetShareCard key={pet.id} pet={pet} />

      <div className="vet-toolbar no-print">
        <div className="day-range">
          {[30, 45, 90].map((option) => (
            <button
              key={option}
              type="button"
              className={days === option ? 'choice-button active' : 'choice-button'}
              onClick={() => onChangeDays(option)}
            >
              {option} {t('days')}
            </button>
          ))}
        </div>
        <div className="vet-actions">
          {canShare && (
            <button className="secondary-button" type="button" onClick={shareSummary}>
              <Share2 size={16} /> {t('Share summary')}
            </button>
          )}
          <button className={canShare ? 'ghost-button' : 'secondary-button'} type="button" onClick={copySummary}>
            <Copy size={16} /> {copied ? t('Copied') : t('Copy summary')}
          </button>
          <button className="ghost-button" type="button" onClick={() => window.print()}>
            <Printer size={16} /> {t('Save as PDF')}
          </button>
        </div>
      </div>

      <VetSheet summary={summary} species={pet?.species} onMedications={onMedications} checkIns={checkIns} />
    </section>
  )
}

export { VetSummaryView }
