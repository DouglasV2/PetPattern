// A quiet botanical sprig for the Today hero — the "health notebook garden"
// accent. Drawn in currentColor (set to a soft sage) at low opacity so it reads
// as an ambient pressed-leaf in the corner, never a focal illustration. Hidden
// from assistive tech; purely decorative.
function HeroSprig() {
  return (
    <svg className="hero-sprig" width="132" height="120" viewBox="0 0 132 120" fill="none" aria-hidden="true" focusable="false">
      <path d="M104 116 C 104 82, 92 54, 56 32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M96 84 c -15 -7 -28 -2 -33 10 c 16 6 29 2 33 -10 z" fill="currentColor" opacity="0.5" />
      <path d="M92 60 c 13 -10 27 -9 36 2 c -13 10 -27 9 -36 -2 z" fill="currentColor" opacity="0.68" />
      <path d="M74 42 c -13 -8 -26 -3 -31 9 c 14 6 27 2 31 -9 z" fill="currentColor" opacity="0.56" />
      <circle cx="56" cy="32" r="4.6" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

export { HeroSprig }
