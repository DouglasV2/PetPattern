// A small ring gauge for the "days filled" vet stat — pure SVG, no dependency.
function Donut({ pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)))
  const r = 15.5
  const circ = 2 * Math.PI * r
  return (
    <svg className="vet-donut" viewBox="0 0 40 40" role="img" aria-label={`${p}%`}>
      <circle cx="20" cy="20" r={r} className="vet-donut-track" />
      <circle cx="20" cy="20" r={r} className="vet-donut-arc"
        strokeDasharray={`${(circ * p / 100).toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 20 20)" />
      <text x="20" y="20" className="vet-donut-label">{p}%</text>
    </svg>
  )
}

export { Donut }
