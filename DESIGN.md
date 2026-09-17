# DESIGN.md — Design system and craft gate

The brief asks for something that reads as though Apple built it. That is not a
colour scheme. It is a set of constraints applied without exception, and a gate
that work has to pass before it ships. Both are in this file.

What actually makes that kind of interface: **restraint** (one typeface, one
accent, three shadows, two weights of emphasis), **optical care** (tracking that
tightens as type grows, alignment to a grid, hairlines rather than borders),
**material honesty** (a table is a table; it does not pretend to be a card), and
**no unfinished edges** — every empty state, loading state, error state and
keyboard path is designed, because the fiftieth screen is where systems usually
give up.

This file is normative. `SPEC.md` §15 M0 requires the tokens here to be the only
source of colour, type, spacing and motion in the codebase.

---

## 1. Typeface

**SF Pro is not an option.** Apple's font licence covers use in interfaces for
Apple platforms and related documentation; it does not licence SF Pro as a
webfont for a commercial web application. Using it here would be a licence
breach, and `-apple-system` only reaches macOS and iOS users — the CRM is used
on Windows desktops and Android phones, where the stack would silently fall back
to Segoe UI and Roboto and the product would look like three different products.

**Use Geist Sans and Geist Mono**, self-hosted via the `geist` npm package.

Why this and not Inter: Geist is a neutral grotesque drawn specifically for
interfaces, with slightly more geometric, closed forms and tighter default
spacing than Inter — which is precisely the "more modern, more minimal" read
being asked for. It is variable (one file, any weight), it self-hosts with no
external request and no CLS, it ships a matched monospace, and it is
first-party to the Vercel deploy target. Inter Variable is the acceptable
fallback if the business objects; nothing else in this file changes if it is
swapped.

```ts
// crm/src/app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
```

```css
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-geist-mono), ui-monospace, monospace;
```

**Weights: 400, 500, 600 only.** Nothing heavier. Minimalism here is literal —
hierarchy comes from size, colour and space, not from bold. 700+ is reserved for
a single hero figure on a dashboard and nowhere else.

### Numerals — a hard rule for this product

This is a CRM full of money, volumes, distances and references. Every number in
a table, KPI, price breakdown, invoice or reference code MUST use tabular
figures with a slashed zero:

```css
.tnum { font-variant-numeric: tabular-nums slashed-zero; }
```

Money is right-aligned, always two decimal places, always with the currency
symbol, never abbreviated in a table. `£1,240.00`, never `£1.2k`. Abbreviation
belongs on a chart axis, not beside a figure someone is about to invoice.

### Type scale

Tracking tightens as size grows — the single most visible piece of optical care
in Apple's typography, and the thing most systems skip.

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 48 / 52 | 600 | −0.022em | Hero figure only |
| `title-1` | 32 / 38 | 600 | −0.018em | Page title |
| `title-2` | 24 / 30 | 600 | −0.014em | Section |
| `title-3` | 19 / 26 | 600 | −0.010em | Card / panel heading |
| `body-lg` | 17 / 26 | 400 | −0.004em | Reading copy, quote PDF |
| `body` | 15 / 22 | 400 | 0 | Default UI |
| `body-dense` | 14 / 20 | 400 | 0 | Table cells |
| `label` | 13 / 18 | 500 | +0.006em | Field labels, badges |
| `caption` | 12 / 16 | 400 | +0.012em | Helper, timestamps |

No uppercase-with-wide-tracking micro-labels. They are a 2016 dashboard tic and
they hurt legibility. Use `label` at `--text-secondary` instead.

### Copy voice

Sentence case everywhere — page titles, buttons, table headers, menu items.
No exclamation marks. No "Oops". No "Awesome". Buttons name the action in the
user's words: `Send quote`, not `Submit`. Errors say what happened and what to
do, in that order. Dates read `17 Sep 2026` in UK format; times are 24-hour with
the timezone implied by a single UK-wide setting.

---

## 2. Colour

Near-monochrome by default. Colour is information, not decoration: an accent
means "this is the action", a status colour means "this needs attention", and
everything else is ink on paper.

### Ink ramp (neutral, marginally cool)

| Token | Light | Dark |
|---|---|---|
| `--ink-1` (primary text) | `#0A0A0B` | `#F5F5F7` |
| `--ink-2` (secondary) | `#5E5E66` | `#A1A1A9` |
| `--ink-3` (muted / placeholder) | `#7C7C85` | `#7C7C85` |
| `--ink-4` (disabled) | `#A1A1A9` | `#5E5E66` |
| `--hairline` | `rgb(10 10 11 / 0.10)` | `rgb(255 255 255 / 0.12)` |
| `--hairline-strong` | `rgb(10 10 11 / 0.16)` | `rgb(255 255 255 / 0.20)` |

### Surfaces

| Token | Light | Dark |
|---|---|---|
| `--surface-canvas` | `#FFFFFF` | `#0B0B0C` |
| `--surface-sunken` | `#F7F7F8` | `#09090A` |
| `--surface-raised` | `#FFFFFF` | `#141416` |
| `--surface-overlay` | `#FFFFFF` | `#1C1C1F` |
| `--surface-scrim` | `rgb(10 10 11 / 0.32)` | `rgb(0 0 0 / 0.56)` |

Dark mode is a **designed second theme**, not an inverted first one. Every token
above was chosen for its own surface. Ship both from M0; retrofitting dark mode
is how a system ends up with 40 one-off hex values.

### Accent — one per brand, used sparingly

The accent appears on the primary button, the active nav item, the focus ring,
selected state, and progress. Nowhere else. A screen should be readable in
greyscale with no loss of meaning.

| Brand | Placeholder accent |
|---|---|
| EcoGreen Movers | `#18794E` |
| Eco London Movers | `#0B5FA5` |
| Continuum Green | `#146B63` |
| Removals Company Manchester | `#B42318` |
| Edinburgh Moving | `#43467F` |
| Glasgow Moving | `#1D4ED8` |

**These are placeholders.** Replace with each brand's real values before M0 is
signed off. Any replacement MUST clear 4.5:1 against `--surface-canvas` when
used for text and 3:1 when used for a UI boundary, in both themes. If a real
brand colour fails, keep the brand colour for the logo and derive a darker
accessible step for interactive use — do not ship a failing contrast ratio to
preserve a hex.

### Status — fixed, never brand-themed

`good #0CA30C` · `warning #FAB219` · `serious #EC835A` · `critical #D03B3B`

Always paired with an icon and a text label. Never colour alone — this covers
colour-blind users, greyscale printing of job sheets, and forced-colours mode.

---

## 3. Space, shape, elevation

**4 px base grid.** Scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 80. Nothing
between. If a layout needs 18 px, the layout is wrong.

**Radius**: `sm 6` (inputs, badges) · `md 10` (buttons, cards) · `lg 14`
(panels, modals) · `xl 20` (sheets) · `full` (avatars, pills). One radius per
component family, consistently.

**Elevation — three levels, and prefer none.**

```css
--shadow-1: 0 1px 2px rgb(10 10 11 / 0.05);                        /* resting card */
--shadow-2: 0 4px 12px rgb(10 10 11 / 0.08);                       /* dropdown, popover */
--shadow-3: 0 16px 48px rgb(10 10 11 / 0.14);                      /* modal, sheet */
```

Separation is a hairline first, a shadow only when something genuinely floats
above the page. In dark mode, elevation is expressed by a lighter surface, not a
darker shadow. No glows, no gradients on surfaces, no glassmorphism.

**Layout**: content column max 1280 px, 24 px page gutters (16 px below 640 px).
Staff screens are dense — table rows 36 px, 12 px cell padding, column widths
that hold the largest realistic value without wrapping.

---

## 4. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `--motion-instant` | 120 ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus, toggle |
| `--motion-quick` | 200 ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Popover, dropdown, tooltip |
| `--motion-settled` | 320 ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Modal, sheet, drawer, route |

Animate `transform` and `opacity` only. Never animate `height`, `top` or
`box-shadow`. Nothing loops, nothing bounces, nothing announces itself. Motion
exists to show where a thing came from, then get out of the way.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Components — the non-obvious rules

- **Buttons**: primary (accent fill), secondary (hairline, transparent), ghost,
  destructive. One primary per view. A destructive action that cannot be undone
  requires typed confirmation, not just a second click.
- **Inputs**: label above, always visible — never a placeholder as label. Helper
  text reserves its line so validation does not shift the layout. Errors appear
  on blur, not on keystroke. Required fields are marked; optional ones are not.
- **Tables**: sticky header, zebra-free (hairlines only), row hover, numeric
  columns right-aligned with tabular figures, sortable headers with a visible
  sort state, server-side pagination past 50 rows. Row click opens the record;
  actions live in an end-aligned menu, never as five buttons per row.
- **Command palette (⌘K / Ctrl-K)**: jump to any lead, quote, job, customer or
  screen by reference or name. This is the single highest-leverage detail in a
  system where staff handle hundreds of records a day.
- **Keyboard**: every list is arrow-navigable, `Esc` closes the topmost layer,
  `⌘Enter` submits the focused form, `/` focuses search. Document the shortcuts
  in a `?` overlay.
- **Toasts**: bottom-left, 4 s, one at a time, with an undo affordance where the
  action is reversible. Never a toast for something the UI already shows.

---

## 6. Imagery and stock photography

Photography earns its place on exactly three surfaces: brand-facing portal
pages, the login screen, and the marketing side of the embeddable widget.
**Never inside the CRM's data surfaces.** A photograph behind a leads table is
noise competing with the thing the user came to read.

- Source from Unsplash or Pexels under their standard licences. Record the
  source URL, photographer and licence for every asset in
  `crm/public/photos/CREDITS.md` — an unattributed licence trail is a problem
  that surfaces at the worst moment.
- Subject matter: vans, crates, hallways, loading, warehouse light, road and
  city texture. Prefer environment and material over people.
- Avoid the stock clichés outright: grinning teams with clipboards, high-fives,
  handshakes over boxes, headset call-centre portraits. They read as generic and
  they actively undercut a premium impression.
- Grade every image to one consistent treatment — cool-neutral, slightly
  desaturated, matched contrast — so six brands still look like one platform.
- Technical: `next/image`, AVIF then WebP, explicit `width`/`height` to hold
  layout, `priority` only on the LCP image, everything else lazy. Descriptive
  `alt` that says what the image shows; `alt=""` if it is purely decorative.
- **Replace stock with real photography of the actual fleet and crews as soon as
  it exists.** Stock is scaffolding, not the finish.
- Icons: one set, one stroke weight (1.5 px), 20 px and 24 px only. Room and
  item icons in the inventory builder are a single custom set drawn to the same
  weight — a mixed icon set is the fastest way to look assembled rather than
  designed.

---

## 7. Data visualisation

Charts follow a fixed method. The rules below are hard requirements and several
are counter-intuitive, so read them before writing chart code.

**Charts are not brand-themed.** The accent changes per brand; the chart palette
does not. Six accent-tinted palettes would mean the same dashboard is legible in
one brand and muddy in five.

### Categorical palette — fixed order, never cycled

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2A78D6` | `#3987E5` |
| 2 | orange | `#EB6834` | `#D95926` |
| 3 | aqua | `#1BAF7A` | `#199E70` |
| 4 | yellow | `#EDA100` | `#C98500` |
| 5 | magenta | `#E87BA4` | `#D55181` |
| 6 | green | `#008300` | `#008300` |
| 7 | violet | `#4A3AA7` | `#9085E9` |
| 8 | red | `#E34948` | `#E66767` |

This ordering is validated, not chosen by eye: worst adjacent colour-vision-
deficiency separation ΔE 9.1 light / 8.4 dark against a ≥8 target, worst
normal-vision adjacent ΔE 19.6 against a ≥15 floor. **The order is the safety
mechanism** — assign slot 1, then 2, then 3. Never skip, never cycle, never
generate a ninth colour. A ninth series folds into "Other" or becomes small
multiples.

For scatter, bubble and small-multiple forms where every pair is visible at
once, **cap at three series** — slots 1–3 are the only subset that clears the
floors on all pairs. Slot 4 puts yellow beside orange, which fails.

Slots 3, 4 and 5 sit below 3:1 against the light surface. Where they are used,
ship visible direct labels or a table view — this obligation is not optional.

### The rules that matter most

- **Never a dual-axis chart.** Two measures at different scales become two
  charts, small multiples, or both indexed to a common base. This is the single
  most common serious chart mistake and it will appear in a revenue-vs-leads
  dashboard unless it is refused up front.
- Sequential (magnitude): one hue, light → dark. Diverging (polarity): blue ↔
  red with a **grey** midpoint. Never a rainbow, never a hue at the midpoint.
- Colour follows the entity, not its rank. Filtering out a series must not
  repaint the survivors.
- Two or more series: a legend is always present, and four or fewer are also
  directly labelled. One series needs no legend — the title names it.
- Text wears text tokens, never the series colour. A coloured mark beside a
  label carries the identity.
- Status colours are reserved. `critical` is never "series 4".
- Marks: 2 px lines, ≥8 px points, 4 px rounded data-ends anchored to the
  baseline, 2 px surface gap between adjacent or stacked fills. Grid and axes
  recede — hairline weight, `--ink-3`.
- Hover is default, not a nice-to-have: crosshair plus tooltip on lines and
  areas, per-mark tooltip on bars, dots and cells. Filters sit in one row above
  the charts.
- Every chart has a table view. Every chart's numbers use tabular figures.
- **Ask whether it should be a chart at all.** A single KPI is a number, set in
  `display`, with its comparison beneath it in `caption`. A five-row breakdown
  is a table. Reach for a chart only when shape over time or across categories
  is the actual message.

---

## 8. States — the part that separates 8/10 from 12/10

Every list, panel and form ships all five. A screen is not done until all five
are built and screenshotted.

1. **Empty — first run**: explain what will appear here and give the action that
   creates the first one. Never a shrug and a dash.
2. **Empty — filtered to nothing**: distinct from the above, with a clear-filters
   action. These are different situations and must not share a message.
3. **Loading**: skeletons whose geometry matches the real content, so nothing
   moves when data lands. No centred spinners on full pages.
4. **Error**: what failed, whether it was saved, what to do, and a retry. Never a
   raw exception, never a bare status code.
5. **Partial / stale**: when one panel of a dashboard fails, that panel shows the
   failure; the rest of the page still works.

Optimistic updates roll back visibly on failure with an explanation. Long
operations (PDF render, bulk send, export) report progress and are cancellable
where cancellation is meaningful.

---

## 9. The audit gate

A screen ships only when every line passes. Run this before marking any
`SPEC.md` milestone complete, and record the result in `PROGRESS.md`.

**Type and colour**
- [ ] Every colour, size, space, radius and duration comes from a token. Zero
      hardcoded hex outside the token file.
- [ ] Tracking follows the scale; no default tracking on large type.
- [ ] Every number in a table, KPI or money field uses tabular figures.
- [ ] The screen is fully usable and unambiguous in greyscale.
- [ ] Dark mode is checked on the real screen, not assumed.

**Layout and craft**
- [ ] Everything lands on the 4 px grid.
- [ ] Optical alignment checked: icons beside text, numbers in columns, label
      baselines.
- [ ] No layout shift from first paint to loaded (CLS < 0.05).
- [ ] Works at 320 px wide and at 200% browser zoom.
- [ ] Longest realistic value tested in every field and column — a 60-character
      company name, a £100,000 quote, a 12-item address.

**Interaction**
- [ ] Complete keyboard path; visible focus on every interactive element.
- [ ] `Esc` closes the topmost layer; focus returns where it came from.
- [ ] All five states from §8 exist and have been seen.
- [ ] Destructive actions confirm; reversible ones offer undo.

**Accessibility**
- [ ] Zero axe criticals; WCAG 2.2 AA contrast on text and UI boundaries.
- [ ] Touch targets ≥ 44 px.
- [ ] Meaning never carried by colour alone.
- [ ] Reduced-motion respected.
- [ ] Screen-reader pass on the primary flow: labels, roles, live regions for
      async results.

**Performance**
- [ ] LCP < 1.8 s on simulated 4G; INP < 200 ms.
- [ ] No unbounded list renders; pagination server-side past 50 rows.
- [ ] Images sized, lazy below the fold, modern formats.

**Content**
- [ ] Sentence case throughout; no exclamation marks; no filler enthusiasm.
- [ ] Buttons name their action in the user's words.
- [ ] Errors say what happened, then what to do.
- [ ] UK date format; money always two decimals with a symbol.

---

## 10. What this system deliberately does not do

Listed because each will be suggested at some point, and each would cost the
result more than it adds: gradient-filled cards · glassmorphism and blur panels
· coloured shadows · illustration mascots · animated page transitions between
staff routes · more than one accent per brand · bold weights for hierarchy ·
uppercase tracked micro-labels · dark mode by CSS inversion · icon sets mixed
from two libraries · dual-axis charts · a dashboard that looks impressive in a
screenshot and is unreadable at 7 a.m. on a Tuesday.
