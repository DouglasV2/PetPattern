// The brand mark: a paw whose pads sit on a small memory trail, with one coral
// pad for the point that changed. Drawn in currentColor so it inherits the
// .brand-mark colour (white on teal, teal on the soft variant); only the changed
// pad carries the fixed coral accent.
function BrandMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 15.4 C 14.2 13.8, 15.7 12.8, 16.7 10.9" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" strokeDasharray="0.2 1.7" opacity="0.6" />
      <circle cx="7.45" cy="10.65" r="1.75" fill="currentColor" />
      <circle cx="10.35" cy="8.35" r="1.75" fill="currentColor" />
      <circle cx="13.65" cy="8.35" r="1.75" fill="currentColor" />
      <circle cx="16.55" cy="10.65" r="1.75" fill="#bf5a46" />
      <path d="M12 12.2c2.15 0 3.75 1.55 3.75 3.4 0 1.55-1.5 2.4-3.75 2.4s-3.75-.85-3.75-2.4c0-1.85 1.6-3.4 3.75-3.4z" fill="currentColor" />
    </svg>
  )
}

export { BrandMark }
