# Jord

Jord is a Hugo site deployed on Netlify. It now has two public surfaces:

- `/` — an online publication of texts related to the process of renaming the garden.
- `/garden/` — a read-only archive of the former participatory virtual garden.

The publication is maintained with Markdown files in the headless `content/texts/` bundle. The archive still renders the historical garden from JSON files in `static/`, but visitors can no longer submit words, names, comments, or name feedback.

## Project structure

### Publication

- `layouts/index.html`: publication homepage, index, inline reader, and anchored text links.
- `content/texts/index.md`: headless content bundle for publication texts.
- `archetypes/text.md`: starter front matter for new publication texts.
- `assets/js/main.js`: hash navigation and restrained viewport-limited word-rain transitions between texts.
- `assets/sass/style.scss`: publication typography, index, reader, transition, responsive, and reduced-motion styles.

Add a text by duplicating the example or using the archetype, then setting front matter like:

```yaml
---
title: "Text title"
author: "Author name"
credit: ""
genre: "essay"
genre_label: "Essay"
weight: 10
slug: "text-title"
audio:
  src: ""
  title: ""
  caption: ""
---
```

Direct links use `/#text-title`. Supported genre-specific presentation currently includes essays, poems, dramas, and conversations. Drama files also use a `characters` list in front matter. When `audio.src` is set, the player appears after the title; in dramas it appears after the character list.

Publication Markdown can include a styled audio player with:

```go-html-template
{{< audio src="/lyd/have1.mp3" title="Audio title" caption="Optional caption." >}}
```

### Garden archive

- `content/garden/_index.md`: creates the `/garden/` archive route.
- `layouts/garden/list.html`: read-only archive shell.
- `layouts/partials/topnav.html`: publication/archive navigation and the STL hand only on `/garden/`.
- `static/words.json`: archived word records with `word`, `fontSize`, `date`, and `updated`.
- `static/comments.json`: archived comments grouped by word key.
- `static/names.json`: archived garden name records.
- `static/name-feedback.json`: archived feedback keyed by normalized garden name.
- `static/svgs.json`, `static/svg/`: SVG artwork manifest and assets.
- `static/lydfiler.json`, `static/lyd/`: audio manifest and files.
- `static/lillehaand.stl`: STL model used in archive navigation.

Archive behavior:

1. `assets/js/main.js` fetches the JSON manifests client side.
2. Words, names, SVGs, and sounds are rendered into the garden.
3. Clicking a word shows archived comments only; no comment form is created.
4. Clicking a name shows archived feedback comments only; no voting/comment form is created.
5. No new words, names, comments, votes, or archive exports can be submitted from the public archive.

### Netlify functions

The former public submission functions remain deployed only as tombstones for old clients:

- `submit-word`
- `submit-comment`
- `submit-name`
- `submit-name-feedback`

Each returns HTTP `410` with a read-only archive message. Scheduled digest/deploy triggers are removed from `netlify.toml` because the public collection process is closed.

## Local development

### Prerequisites

- Hugo `0.112.5` on Netlify; local builds currently work with Hugo `0.157.0` as well.
- Node.js and npm for Netlify function dependencies.

### Install dependencies

```bash
npm install
```

### Build to a temporary directory

```bash
hugo --destination /tmp/jord-hugo-build --cleanDestinationDir
```

### Run Hugo locally

```bash
hugo server
```

## Design source of truth

See `DESIGN.md` for the publication/archive design contract, motion rules, accessibility constraints, and open content questions.
