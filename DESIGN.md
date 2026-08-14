# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-08-14
- Primary product surfaces: Publication homepage `/`; read-only garden archive `/garden/`.
- Evidence reviewed: `README.md`, `layouts/_default/baseof.html`, `layouts/_default/list.html`, `layouts/partials/topnav.html`, `assets/js/main.js`, `assets/sass/style.scss`, `static/*.json`, `netlify/functions/*`.

## Brand
- Personality: quiet, literary, garden-like, sparse, process-aware.
- Trust signals: plain typography, visible authorship, direct archive access, no hidden contribution affordances after archival.
- Avoid: flashy transitions, heavy app chrome, new visual systems unrelated to the existing word garden.

## Product goals
- Goals: turn Jord into an online publication of texts about the renaming process; keep the former virtual garden accessible as an archive.
- Non-goals: collecting new visitor submissions, votes, comments, or name suggestions.
- Success signals: visitors can choose a text from an author index, read it comfortably, copy/share an anchored URL, and still visit the archived garden.

## Personas and jobs
- Primary personas: exhibition/publication readers; people familiar with Rønnebæksholm and the naming process; maintainers adding texts.
- User jobs: browse texts by title and author; read one text at a time; revisit the archived participatory garden.
- Key contexts of use: mobile and desktop browsers, gallery/event follow-up links, shared direct links.

## Information architecture
- Primary navigation: homepage publication with a small link to `/garden/`; archive page with a small link back to `/`.
- Core routes/screens: `/` publication index and reader; `/#text-slug` direct text anchor; `/garden/` read-only garden archive.
- Content hierarchy: publication title, introduction, and index rows as the entry state; back-to-index control and one active text as the reading state; archive intro overlay, word/name/sound field, read-only comments.

## Design principles
- Principle 1: Treat words as material; interactions may move words, but should feel quiet and inevitable.
- Principle 2: Keep the archive clearly accessible but secondary to the publication.
- Tradeoffs: use enough motion to connect publication and garden, but cap animated words to the viewport and honor reduced-motion preferences.

## Visual language
- Color: near-white publication background with black typography; archive keeps the existing white/transparent garden language.
- Typography: ABC Synt Regular for publication titles; Jost Regular for publication body copy, metadata, navigation, controls, and labels. The garden archive retains its existing typography.
- Spacing/layout rhythm: generous margins, large typographic hierarchy, single active reading column.
- Shape/radius/elevation: square borders only where existing UI uses them; no rounded card system.
- Motion: restrained viewport-limited word rain between texts; instant reveal for `prefers-reduced-motion`.
- Imagery/iconography: keep the existing STL hand only in the garden archive.

## Components
- Existing components to reuse: garden word/name rendering, comment display, archive overlay panels, STL navigation object, native browser audio controls inside a site-styled frame.
- New/changed components: publication index row, sticky index trigger, publication reader, word-rain transition layer, publication audio shortcode, read-only archive dialog copy.
- Variants and states: index-only entry state; active/preparing/revealed single-text reading state with the index removed from layout; empty publication state; archive read-only comments.
- Token/component ownership: CSS remains in `assets/sass/style.scss`; behavior remains in `assets/js/main.js`.

## Accessibility
- Target standard: practical WCAG 2.1 AA alignment.
- Keyboard/focus behavior: index links are real anchors; active text receives programmatic focus after selection.
- Contrast/readability: black text on near-white/white backgrounds; existing archive name colors remain data-derived.
- Screen-reader semantics: publication index is an ordered list; active link uses `aria-current`; reader announces changes politely.
- Reduced motion and sensory considerations: disable rain animation under `prefers-reduced-motion: reduce`.

## Responsive behavior
- Supported breakpoints/devices: mobile and desktop responsive layouts.
- Layout adaptations: publication index collapses from two-column rows to stacked title/author; archive keeps existing mobile controls.
- Touch/hover differences: hover effects must also be visible through focus states.

## Interaction states
- Loading: archive keeps the existing JSON-loading behavior; publication is static at render time.
- Empty: publication displays maintainer instructions when no non-draft Markdown texts exist.
- Error: archive JSON fetch failures fall back to empty arrays/objects as before.
- Success: selecting an index row hides the publication title and index, shows only the chosen text plus the back-to-index control, and updates the URL hash.
- Disabled: archive submission controls are removed; tombstoned functions return HTTP 410.
- Offline/slow network, if applicable: publication still renders; archive media/data may be partial.

## Content voice
- Tone: precise, calm, publication-like.
- Terminology: use “publication” for the new homepage and “garden archive” for the old participatory garden.
- Microcopy rules: never invite visitors to submit, suggest, vote, or comment in archive contexts.

## Implementation constraints
- Framework/styling system: Hugo templates, SCSS through Hugo Pipes, vanilla JavaScript.
- Design-token constraints: no new dependency or design-token layer.
- Performance constraints: rain only viewport words, capped in JavaScript; avoid wrapping whole long texts.
- Compatibility constraints: submission endpoints remain present but return HTTP 410 so old clients fail read-only.
- Test/screenshot expectations: build to a temporary destination; inspect generated `/`, `/garden/`, CSS/JS, and function tombstones.

## Open questions
- [ ] Confirm missing author credits for the poem and workshop dramas / content owner / required before final publication crediting.
- [ ] Add final audio files and captions as recordings become available / content owner / optional per text.
- [ ] Final homepage title and introductory sentence / editor / affects publication tone.
