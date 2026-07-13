function RecapStat({ value, label }) {
  return (
    <div className="recap-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export { RecapStat }
