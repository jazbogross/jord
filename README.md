# Jord

Jord is a Hugo site deployed on Netlify. The published HTML is mostly a shell; the actual garden is assembled in the browser from JSON files in `static/`, and Netlify Functions write visitor submissions back into those JSON files through GitHub API calls.

It's a static site with JSON-backed interaction:

- Hugo builds the document shell and serves compiled assets.
- `assets/js/main.js` fetches words, names, name feedback, SVG manifests, and audio manifests client side.
- The browser renders an endless garden of visitor-submitted words, garden names, and sounds which the visitor can comment on.
- Garden name feedback is capped to three votes per name per browser via a cookie, and each like/dislike changes that name's display size by `+1` or `-1`.
- Netlify Functions rewrite the JSON files in GitHub.
- Scheduled functions email a daily digest and trigger a rebuild so committed changes become visible on the live site.
- The site is available in Danish and English, determined by the users browser.

## Project structure

### Hugo and frontend

- `hugo.toml`: site config and base URL.
- `layouts/_default/baseof.html`: base document shell and compiled JS include.
- `layouts/_default/list.html`: homepage overlays, forms, and name-feedback dialog.
- `layouts/partials/head.html`: metadata, CSS include, Netlify Identity widget, and import map.
- `layouts/partials/topnav.html`: STL hand and fixed action buttons.
- `assets/sass/style.scss`: all site styling.
- `assets/js/main.js`: runtime app logic for rendering, overlays, submissions, motion, infinite scroll, per-name vote-limit cookies, and live name-size updates.

### Static data and media

- `static/words.json`: word records with `word`, `fontSize`, `date`, and `updated`.
- `static/comments.json`: comment objects grouped by word key.
- `static/names.json`: garden name records with `name`, `color`, `date`, and `lastUpdated`.
- `static/name-feedback.json`: feedback keyed by normalized garden name, with `likes`, `dislikes`, `positiveComments`, and `negativeComments`.
- `static/svgs.json`: manifest of words that should render as SVG artwork.
- `static/svg/`: SVG assets.
- `static/lydfiler.json`: manifest of audio files to place in the garden.
- `static/lyd/`: audio assets.
- `static/lillehaand.stl`: STL model used in the top navigation.



## Broser Runtime

### Frontend rendering

`assets/js/main.js` does all runtime assembly:

1. Reads browser language.
2. Applies localized copy.
3. Fetches `words.json`, `names.json`, `name-feedback.json`, `lydfiler.json`, and `svgs.json`.
4. Renders one shuffled batch of words and names.
5. Inserts audio elements into that batch.
6. Sets up an `IntersectionObserver` so additional batches are appended before the user reaches the bottom.

### Word submission

`submit-word`:

1. Verifies reCAPTCHA.
2. Fetches `static/words.json` from GitHub.
3. Decodes the submitted UTF-8 payload.
4. Splits the submitted text on spaces.
5. Increments `fontSize` on existing exact matches or appends new word entries.
6. Commits the updated JSON back to GitHub with `[skip netlify]`.

### Word comment submission

`submit-comment`:

1. Verifies reCAPTCHA.
2. Fetches `static/comments.json` from GitHub.
3. Appends a comment object under the submitted word key.
4. Commits the updated JSON back to GitHub with `[skip netlify]`.

### Garden name submission

`submit-name`:

1. Verifies reCAPTCHA.
2. Fetches `static/names.json` from GitHub.
3. Decodes the submitted UTF-8 payload.
4. Normalizes spacing and matching by lowercased text.
5. Overwrites `lastUpdated` for an existing normalized match or creates a new name record.
6. Assigns a random hex color to new names.
7. Commits the updated JSON back to GitHub with `[skip netlify]`.

### Garden name feedback

`submit-name-feedback`:

1. Verifies reCAPTCHA.
2. Fetches `static/name-feedback.json` and `static/names.json` from GitHub.
3. Normalizes the submitted name key.
4. Increments `likes` or `dislikes`.
5. Appends the optional comment to `positiveComments` or `negativeComments`.
6. Overwrites the matching name record's `lastUpdated` timestamp in `static/names.json`.
7. Commits the updated JSON back to GitHub with `[skip netlify]`.

### Scheduled functions

`netlify.toml` schedules:

- `send-email` at `0 18 * * *`
- `deploy` at `0 0 * * *`

Current behavior:

- `send-email` fetches the deployed `words.json`, `names.json`, and `comments.json`, filters them to the last 24 hours, and emails a digest.
- `deploy` POSTs to the Netlify build hook from `DEPLOY_HOOK`.

## Local development

### Prerequisites

- Hugo `0.112.5`
- Node.js and npm

### Install dependencies

```bash
npm install
```

### Run Hugo only

```bash
hugo server
```

## Environment variables

The functions rely on these environment variables stored in Netlify ENVs.