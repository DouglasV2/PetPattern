/**
 * One section of the vet summary.
 *
 * `tone="key"` marks a finding a vet should read first (the owner's concern, the possible
 * patterns, urgent signs). Those get an ink heading and the same left rule the urgent banner
 * already uses, so the report scans in two tiers instead of one flat wall. Everything else is
 * supporting detail and keeps the quiet uppercase label.
 */
function VetBlock({ title, tone = 'supporting', children }) {
  return (
    <section className={tone === 'key' ? 'vet-block vet-block-key' : 'vet-block'}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export { VetBlock }
