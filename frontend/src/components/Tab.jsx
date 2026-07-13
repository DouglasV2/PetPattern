function Tab({ active, onClick, icon, label }) {
  return (
    <button className={active ? 'record-tab active' : 'record-tab'} type="button" onClick={onClick} aria-current={active ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export { Tab }
