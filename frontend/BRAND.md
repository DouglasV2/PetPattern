# PetPattern brand mark

## The idea

Small daily signals becoming a meaningful pattern over time.

The mark reads as a paw, but it isn't a generic paw. The four toe pads sit on a
quiet **memory trail** — a dotted curve that runs from the palm (the record
everything rests on) up toward the pads. One pad is **coral**: the point that
*changed*. That single warm dot is the whole product in one glyph — you log
small things, and PetPattern remembers the one that shifted.

It's calm and slightly premium on purpose: no cartoon face, no medical cross, no
heartbeat line, no gradients, no robot/AI cues. Three colours, geometric, rounded
but not childish. It holds up as a 16px favicon and as a 512px app icon.

## Files (`frontend/public/`)

| File | Use |
|------|-----|
| `logo-icon.svg` | Full-colour app icon — rounded teal square, off-white paw, one coral pad. |
| `logo-horizontal.svg` | Icon + `PetPattern` wordmark (system font stack, no external font). |
| `logo-mono.svg` | Single-colour glyph for small / stamped use. Recolour via `currentColor`. |
| `favicon.svg` | Browser tab icon (same as `logo-icon.svg`). Referenced from `index.html`. |

In the app itself the mark is the inline `BrandMark` component in `App.jsx`. It
draws the glyph in `currentColor`, so it inherits whatever the `.brand-mark`
container sets (white on the teal chip, teal on the soft variant) while the
changed pad keeps its fixed coral.

## Palette (already in `styles/tokens.css :root`)

```css
--teal:  #2f766d;  /* primary — trust, calm */
--sage:  #6d8b5f;  /* supporting green */
--coral: #c75b46;  /* the one accent — "what changed" */
--ink:   #1f2933;  /* text */
--paper: #f6f7f3;  /* off-white background */
```

Restraint is the point: the mark uses teal + off-white + a single coral accent.
Sage and gold exist for surfaces and status chips, not for the logo.

## Don'ts

Don't add a face, a cross, a heartbeat, a gradient, or a second accent colour.
Don't outline the paw. Don't rotate it. If it ever needs to shrink below ~16px,
use `logo-mono.svg`.
