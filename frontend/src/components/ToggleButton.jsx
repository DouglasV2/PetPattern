import { Check } from 'lucide-react'

function ToggleButton({ active, label, onClick }) {
  return (
    <button className={active ? 'toggle-button active' : 'toggle-button'} type="button" aria-pressed={active} onClick={onClick}>
      {active && <Check size={15} />}
      {label}
    </button>
  )
}

export { ToggleButton }
