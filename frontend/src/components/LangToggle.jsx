import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { LANGUAGES } from '../i18n'
import { Flag } from './Flag'

function LangToggle({ lang, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <div className="lang-menu" ref={ref}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
              aria-label={`Language: ${current.label}`} onClick={() => setOpen((o) => !o)}>
        <Flag code={current.code} size={20} />
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown className="chev" size={15} />
      </button>
      {open && (
        <div className="lang-list" role="listbox" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" role="option" aria-selected={l.code === lang}
                    className={l.code === lang ? 'lang-item active' : 'lang-item'}
                    onClick={() => { onChange(l.code); setOpen(false) }}>
              <Flag code={l.code} size={20} />
              <span>{l.label}</span>
              {l.code === lang && <Check className="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { LangToggle }
