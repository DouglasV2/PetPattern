// Small, self-contained flag glyphs for the language picker. Inline SVG (not
// emoji) so they render the same on every OS — Windows shows flag emoji as bare
// letters. Simplified but recognisable; 3:2 ratio.
function Flag({ code, size = 20 }) {
  const w = size, h = Math.round(size * 0.68)
  const box = { width: w, height: h, viewBox: '0 0 24 16', style: { borderRadius: 2, display: 'block', flex: 'none' }, 'aria-hidden': true }
  switch (code) {
    case 'hr': return (<svg {...box}><rect width="24" height="5.33" fill="#c8102e"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#1e40af"/><rect x="9.6" y="4.4" width="4.8" height="4.8" fill="#fff"/><rect x="9.6" y="4.4" width="1.6" height="1.6" fill="#c8102e"/><rect x="12.8" y="4.4" width="1.6" height="1.6" fill="#c8102e"/><rect x="11.2" y="6" width="1.6" height="1.6" fill="#c8102e"/><rect x="9.6" y="7.6" width="1.6" height="1.6" fill="#c8102e"/><rect x="12.8" y="7.6" width="1.6" height="1.6" fill="#c8102e"/></svg>)
    case 'de': return (<svg {...box}><rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.33" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/></svg>)
    case 'es': return (<svg {...box}><rect width="24" height="16" fill="#c60b1e"/><rect y="4" width="24" height="8" fill="#ffc400"/></svg>)
    case 'fr': return (<svg {...box}><rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/></svg>)
    case 'it': return (<svg {...box}><rect width="8" height="16" fill="#009246"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce2b37"/></svg>)
    case 'pl': return (<svg {...box}><rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#dc143c"/></svg>)
    case 'no': return (<svg {...box}><rect width="24" height="16" fill="#ba0c2f"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="24" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205b"/><rect y="7" width="24" height="2" fill="#00205b"/></svg>)
    case 'en': return (<svg {...box}><rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2"/><path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.6"/><rect x="9.5" width="5" height="16" fill="#fff"/><rect y="5.5" width="24" height="5" fill="#fff"/><rect x="10.5" width="3" height="16" fill="#c8102e"/><rect y="6.5" width="24" height="3" fill="#c8102e"/></svg>)
    case 'nl': return (<svg {...box}><rect width="24" height="5.33" fill="#ae1c28"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#21468b"/></svg>)
    case 'sv': return (<svg {...box}><rect width="24" height="16" fill="#006aa7"/><rect x="7" width="3" height="16" fill="#fecc00"/><rect y="6.5" width="24" height="3" fill="#fecc00"/></svg>)
    case 'da': return (<svg {...box}><rect width="24" height="16" fill="#c8102e"/><rect x="7" width="3" height="16" fill="#fff"/><rect y="6.5" width="24" height="3" fill="#fff"/></svg>)
    case 'pt': return (<svg {...box}><rect width="24" height="16" fill="#da291c"/><rect width="9.6" height="16" fill="#046a38"/><circle cx="9.6" cy="8" r="2.4" fill="#ffcc00" stroke="#fff" strokeWidth="0.4"/></svg>)
    case 'ro': return (<svg {...box}><rect width="8" height="16" fill="#002b7f"/><rect x="8" width="8" height="16" fill="#fcd116"/><rect x="16" width="8" height="16" fill="#ce1126"/></svg>)
    case 'cs': return (<svg {...box}><rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#d7141a"/><path d="M0 0 L12 8 L0 16 Z" fill="#11457e"/></svg>)
    case 'sk': return (<svg {...box}><rect width="24" height="5.33" fill="#fff"/><rect y="5.33" width="24" height="5.33" fill="#0b4ea2"/><rect y="10.66" width="24" height="5.34" fill="#ee1c25"/><path d="M3.4 4 h4 v3.6 q0 2.2 -2 3 q-2 -0.8 -2 -3 z" fill="#fff" stroke="#ee1c25" strokeWidth="0.5"/></svg>)
    case 'el': return (<svg {...box}><rect width="24" height="16" fill="#004c98"/><rect y="1.78" width="24" height="1.78" fill="#fff"/><rect y="5.33" width="24" height="1.78" fill="#fff"/><rect y="8.89" width="24" height="1.78" fill="#fff"/><rect y="12.44" width="24" height="1.78" fill="#fff"/><rect width="8.9" height="8.9" fill="#004c98"/><rect x="3.5" width="1.9" height="8.9" fill="#fff"/><rect y="3.5" width="8.9" height="1.9" fill="#fff"/></svg>)
    default: return (<svg {...box}><rect width="24" height="16" fill="#6d8b5f"/></svg>)
  }
}

export { Flag }
