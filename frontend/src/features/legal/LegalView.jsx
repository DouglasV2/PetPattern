import { ArrowLeft } from 'lucide-react'
import { t } from '../../i18n'
import { LEGAL } from '../../legal'
import { BrandMark } from '../../components/BrandMark'
import { LangToggle } from '../../components/LangToggle'

function LegalView({ section, lang, onLangChange, onBack }) {
  const content = (LEGAL[lang] || LEGAL.en)
  const order = ['privacy', 'terms', 'disclaimer']
  return (
    <div className="onboard-shell">
      <main className="onboard-panel legal-panel">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={20} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        {order.map((key) => {
          const doc = content[key]
          return (
            <section key={key} id={key} className="legal-doc">
              <h1>{doc.title}</h1>
              {doc.body.map((para, i) => <p key={i}>{para}</p>)}
            </section>
          )
        })}
        <p className="muted legal-updated">{content.updated}</p>
      </main>
    </div>
  )
}

export { LegalView }
