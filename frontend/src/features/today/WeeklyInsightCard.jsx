function WeeklyInsightCard({ insight }) {
  if (!insight) return null
  // Tone is decided server-side ("good" | "watch" | "calm") — no text parsing here.
  return (
    <section className={`panel weekly-insight tone-${insight.tone || 'calm'}`} aria-label={insight.headline}>
      {insight.label ? <p className="kicker weekly-insight-eyebrow">{insight.label}</p> : null}
      <h2 className="weekly-insight-headline">{insight.headline}</h2>
      <p className="weekly-insight-body">{insight.body}</p>
      {insight.support ? <p className="weekly-insight-support muted">{insight.support}</p> : null}
    </section>
  )
}

export { WeeklyInsightCard }
