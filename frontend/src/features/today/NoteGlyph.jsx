// Original inline SVG glyph drawn for PetPattern — a small dog-eared note page
// with a soft memory dot. Not from any icon pack, stock set, or external source.
function NoteGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M6.5 3.5h6.2l4.8 4.8V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12.6 3.7v3.1a1.5 1.5 0 0 0 1.5 1.5h3.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14.8" cy="15" r="1.1" fill="currentColor" />
    </svg>
  )
}

export { NoteGlyph }
