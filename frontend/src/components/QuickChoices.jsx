function QuickChoices({ label, value, options, onChange }) {
  return (
    <div className="choice-block">
      <span>{label}</span>
      <div className="choice-grid" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? 'choice-button active' : 'choice-button'}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { QuickChoices }
