# Astro + Preact + Tailwind Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2014 Bootstrap 3 / jQuery implementation of `taak77.github.io` with Astro 7 + Preact + Tailwind 4, preserving the existing look, content, and behavior on a static GitHub Pages deployment.

**Architecture:** A single static Astro page. All content lives in a Zod-validated content collection of 15 markdown files, replacing ~470 lines of copy-pasted modal HTML. The portfolio grid renders as static HTML; only two Preact islands ship JavaScript — a native `<dialog>` modal and the navbar. Styling is Tailwind 4 with Bootstrap 3's breakpoints and the Bootswatch Flatly palette declared as `@theme` tokens.

**Tech Stack:** Astro 7.2.9 (`output: 'static'`), Preact 10.29.8 via `@astrojs/preact` 6.0.4, Tailwind 4.3.3 via `@tailwindcss/vite`, `@fontsource/montserrat` + `@fontsource/lato` 5.3.0, Playwright 1.62.1, TypeScript strict, Node 22.17.0.

**Spec:** `docs/superpowers/specs/2026-08-28-astro-preact-rewrite-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- Work on branch `feat/astro-rewrite` in the worktree at `.worktrees/astro-rewrite`. Never commit to `main`.
- Node `>=22.12.0` is required by Astro 7. `/usr/local/bin/node` is a stale v8.11.3 shim that shadows nvm on `PATH`; every shell must run `export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"` first, or the build fails with a cryptic syntax error.
- Do **not** install `@astrojs/tailwind`. It exists only for legacy Tailwind 3. Tailwind 4 is a Vite plugin.
- Bootstrap 3 breakpoints are mandatory for layout fidelity: `768px`, `992px`, `1200px`. Container widths: `750px`, `970px`, `1170px`, with `15px` horizontal padding.
- Palette, verbatim: `--color-brand-primary: #2c3e50`, `--color-brand-success: #18bc9c`, navbar active `#1a242f`, `btn-default` background `#95a5a6`, body text `#2c3e50`, portfolio hover caption `rgba(24, 188, 156, 0.9)`.
- Body type: Lato `15px`, `line-height: 1.42857143`. `p` is `20px`. Headings are Montserrat `700` uppercase; `h2` is `3em`.
- Retain `<meta name="robots" content="noindex,nofollow">` and `public/robots.txt`. The site stays unindexed deliberately.
- Retain the external Gravatar hero image URL. It is the **only** permitted third-party request.
- Leave `meta description` and `meta author` empty. Do not add Open Graph tags.
- Copy images through byte-for-byte. Do not use Astro `<Image>`, and do not re-encode.
- Preserve every existing public URL: `/img/**`, `/docs/Takashi Aoki.docx`, `/robots.txt`.
- Port all content strings verbatim, including the `Mencached` typo in item 11.
- No `http://` subresources, ever. That bug is the reason for this rewrite.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `.nvmrc` | Pins Node 22 for local shells and CI |
| `package.json` | Deps and scripts (`dev`, `build`, `preview`, `test`, `compare`) |
| `astro.config.mjs` | Static output, Preact integration, Tailwind Vite plugin |
| `tsconfig.json` | Astro strict base |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.astro/`, `.worktrees/`, OS cruft |
| `scripts/compare.sh` | Serves legacy baseline and new build side by side |
| `src/content.config.ts` | Zod schema + glob loader for the `portfolio` collection |
| `src/content/portfolio/*.md` | 15 project entries — the single source of content truth |
| `src/styles/global.css` | Tailwind import, `@theme` tokens, fonts, star divider, container |
| `src/layouts/BaseLayout.astro` | `<head>`, body shell, nav sentinel, global style import |
| `src/pages/index.astro` | Composes all sections; reads the collection |
| `src/components/Hero.astro` | Teal header: avatar, name, divider, title, intro |
| `src/components/PortfolioGrid.astro` | Static 15-tile grid with CSS hover captions |
| `src/components/About.astro` | Teal about block + resume download button |
| `src/components/Footer.astro` | Navy footer + social buttons |
| `src/components/ScrollTop.astro` | Mobile-only scroll-to-top anchor |
| `src/components/StarDivider.astro` | The `hr.star-*` divider, `light` and `primary` variants |
| `src/components/icons/*.astro` | Seven inline SVG icons, replacing Font Awesome |
| `src/components/icons/star-path.ts` | Star `d` attribute, shared by `Star.astro` and the modal island |
| `src/components/Navbar.tsx` | Preact island: shrink, mobile toggle, scrollspy |
| `src/components/PortfolioModal.tsx` | Preact island: native `<dialog>` for all 15 items |
| `public/**` | Verbatim static assets at unchanged URLs |
| `playwright.config.ts` | Test runner against `astro preview` |
| `tests/fixtures/legacy-index.html` | Frozen original page, the parity comparison source |
| `tests/content-files.check.mjs` | Node test: 15 entries exist and are well-formed |
| `tests/parity.spec.ts` | The load-bearing test: rendered content matches legacy exactly |
| `tests/behavior.spec.ts` | Modal, navbar, and network assertions |
| `.github/workflows/deploy.yml` | Test, build, deploy to Pages |

---

## Task 1: Toolchain and Astro scaffold

**Files:**
- Create: `.nvmrc`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run build` that emits `dist/index.html`; npm scripts `dev`, `build`, `preview` used by every later task.

- [ ] **Step 1: Tag the pre-rewrite commit so the comparison target can never drift**

```bash
cd /Users/taak77/dev/taak77.github.io/.worktrees/astro-rewrite
git tag legacy-baseline ebda34b
git tag -l legacy-baseline
```

Expected output: `legacy-baseline`

- [ ] **Step 2: Pin Node and verify the correct binary is active**

Create `.nvmrc`:

```
22.17.0
```

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
node -v && npm -v
```

Expected: `v22.17.0` and `10.9.2`. If you see `v8.11.3`, the stale `/usr/local/bin/node` shim is still winning — fix `PATH` before continuing.

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "taak77-github-io",
  "type": "module",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "playwright test",
    "test:content": "node --test tests/content-files.check.mjs",
    "compare": "bash scripts/compare.sh"
  },
  "dependencies": {
    "@astrojs/preact": "6.0.4",
    "@fontsource/lato": "5.3.0",
    "@fontsource/montserrat": "5.3.0",
    "astro": "7.2.9",
    "preact": "10.29.8"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@tailwindcss/vite": "4.3.3",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.2"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
npx playwright install chromium
```

Expected: `node_modules/` created, no peer-dependency errors.

- [ ] **Step 5: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://taak77.github.io',
  output: 'static',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 6: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", ".worktrees"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.astro/
.worktrees/
.superpowers/
test-results/
playwright-report/
.DS_Store
*.iml
.idea/
```

- [ ] **Step 8: Create a placeholder `src/pages/index.astro` to prove the build works**

```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Portfolio - Takashi Aoki</title>
  </head>
  <body>
    <p>scaffold</p>
  </body>
</html>
```

- [ ] **Step 9: Verify the build succeeds**

Run:

```bash
npm run build && ls dist/index.html
```

Expected: build completes, `dist/index.html` exists. If Astro complains about the Node version, revisit Step 2.

- [ ] **Step 10: Commit**

```bash
git add .nvmrc package.json package-lock.json astro.config.mjs tsconfig.json .gitignore src/pages/index.astro
git commit -m "chore: scaffold Astro 7 + Preact + Tailwind toolchain"
```

---

## Task 2: Freeze the legacy baseline and build the comparison harness

**Files:**
- Create: `tests/fixtures/legacy-index.html`, `scripts/compare.sh`

**Interfaces:**
- Consumes: the `legacy-baseline` tag from Task 1.
- Produces: `tests/fixtures/legacy-index.html`, parsed by `tests/parity.spec.ts` in Task 11. `npm run compare` for the owner's visual review.

- [ ] **Step 1: Freeze the original page as the parity fixture**

```bash
mkdir -p tests/fixtures
git show legacy-baseline:index.html > tests/fixtures/legacy-index.html
wc -l tests/fixtures/legacy-index.html
```

Expected: `798` lines. This file is a frozen fixture — never edit it.

- [ ] **Step 2: Create a legacy worktree so the original site stays servable with all assets**

```bash
git -C /Users/taak77/dev/taak77.github.io worktree add \
  /Users/taak77/dev/taak77.github.io/.worktrees/legacy-baseline legacy-baseline --detach
ls /Users/taak77/dev/taak77.github.io/.worktrees/legacy-baseline/index.html
```

Expected: the path exists. This is the "old site" for visual comparison.

- [ ] **Step 3: Create `scripts/compare.sh`**

Uses Python's stdlib server so the harness adds no npm dependency.

```bash
#!/usr/bin/env bash
# Serves the frozen legacy site and the new build side by side for visual comparison.
set -euo pipefail

LEGACY_DIR="$(git rev-parse --show-toplevel)/../legacy-baseline"

if [ ! -d "$LEGACY_DIR" ]; then
  echo "Legacy worktree missing. Create it with:" >&2
  echo "  git worktree add .worktrees/legacy-baseline legacy-baseline --detach" >&2
  exit 1
fi

npm run build

(cd "$LEGACY_DIR" && python3 -m http.server 8081 >/dev/null 2>&1) &
LEGACY_PID=$!
trap 'kill "$LEGACY_PID" 2>/dev/null || true' EXIT

echo ""
echo "  OLD: http://localhost:8081"
echo "  NEW: http://localhost:4321"
echo ""

npx astro preview --port 4321
```

- [ ] **Step 4: Make it executable and verify both servers respond**

```bash
chmod +x scripts/compare.sh
npm run compare &
sleep 8
curl -s -o /dev/null -w "legacy: %{http_code}\n" http://localhost:8081/
curl -s -o /dev/null -w "new:    %{http_code}\n" http://localhost:4321/
kill %1
```

Expected: `legacy: 200` and `new: 200`.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/legacy-index.html scripts/compare.sh
git commit -m "test: freeze legacy baseline fixture and add comparison harness"
```

---

## Task 3: Relocate static assets and delete the legacy implementation

**Files:**
- Move: `img/` → `public/img/`, `docs/Takashi Aoki.docx` → `public/docs/Takashi Aoki.docx`, `robots.txt` → `public/robots.txt`
- Delete: `index.html`, `css/`, `js/`, `less/`, `fonts/`, `mail/`, `font-awesome-4.1.0/`, `.idea/`, `taak77.github.io.iml`, all `.DS_Store`

**Interfaces:**
- Consumes: nothing.
- Produces: every asset served at its original URL — `/img/portfolio/*.{jpg,png,gif,webp}`, `/img/notion.svg`, `/docs/Takashi Aoki.docx`, `/robots.txt`. Later tasks reference these absolute paths.

- [ ] **Step 1: Move assets into `public/`, preserving git history**

```bash
mkdir -p public/docs
git mv img public/img
git mv "docs/Takashi Aoki.docx" "public/docs/Takashi Aoki.docx"
git mv robots.txt public/robots.txt
ls public/img/portfolio | wc -l
```

Expected: `42` files. `docs/superpowers/` stays at the repo root and is **not** published.

- [ ] **Step 2: Delete the legacy implementation**

```bash
git rm -r --quiet css js less fonts mail font-awesome-4.1.0 index.html taak77.github.io.iml
git rm -r --quiet --ignore-unmatch .idea
find . -name .DS_Store -not -path './node_modules/*' -not -path './.worktrees/*' -delete
git rm --quiet --cached --ignore-unmatch .DS_Store docs/.DS_Store public/img/.DS_Store public/img/portfolio/.DS_Store
git status --short
```

- [ ] **Step 3: Write the failing test — assets must be reachable at their original URLs**

Create `tests/assets.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const REQUIRED_URLS = [
  '/img/notion.svg',
  '/img/portfolio/myads.jpg',
  '/img/portfolio/drivechart.gif',
  '/img/portfolio/espn-web.webp',
  '/img/portfolio/axs-seat-map-3d.webp',
  '/docs/Takashi%20Aoki.docx',
  '/robots.txt',
];

for (const url of REQUIRED_URLS) {
  test(`${url} is served`, async ({ request }) => {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });
}
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Explicit: the default testMatch also grabs *.test.* and *.mjs, which would
  // make Playwright try to run the node:test content check.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx astro preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx playwright test tests/assets.spec.ts`
Expected: 7 passed. A failure here means an asset path changed — fix the move, not the test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move assets to public/ and delete Bootstrap 3 implementation"
```

---

## Task 4: Content collection and the 15 project entries

**Files:**
- Create: `src/content.config.ts`, `src/content/portfolio/*.md` (15 files), `tests/content-files.check.mjs`

**Interfaces:**
- Consumes: asset paths from Task 3.
- Produces: collection `portfolio` with entry `data` shape `{ title: string; order: number; thumbnail: string; images: string[]; imageColumns: 1 | 2; tools: string[] }` and the description as rendered markdown body. Tasks 7, 8, and 11 read this via `getCollection('portfolio')`.

- [ ] **Step 1: Write the failing test**

Create `tests/content-files.check.mjs`. This is plain ESM, **not** TypeScript: Node 22.17.0 cannot execute a `.ts` test file without `--experimental-strip-types`, and the `.check.mjs` suffix also keeps it outside Playwright's `testMatch`.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/content/portfolio';
const REQUIRED_KEYS = ['title', 'order', 'thumbnail', 'images', 'tools'];

test('there are exactly 15 portfolio entries', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 15);
});

test('every entry has required frontmatter, a body, and a unique order', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  const orders = [];

  for (const file of files) {
    const raw = readFileSync(`${DIR}/${file}`, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert.ok(match, `${file}: missing frontmatter block`);

    const [, frontmatter, body] = match;
    for (const key of REQUIRED_KEYS) {
      assert.match(frontmatter, new RegExp(`^${key}:`, 'm'), `${file}: missing ${key}`);
    }
    assert.ok(body.trim().length > 0, `${file}: empty description body`);

    const orderMatch = frontmatter.match(/^order:\s*(\d+)/m);
    assert.ok(orderMatch, `${file}: order is not an integer`);
    orders.push(Number(orderMatch[1]));
  }

  assert.deepEqual(
    [...orders].sort((a, b) => a - b),
    Array.from({ length: 15 }, (_, i) => i + 1),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:content`
Expected: FAIL — `ENOENT: no such file or directory, scandir 'src/content/portfolio'`

- [ ] **Step 3: Create the collection schema**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int().positive(),
    thumbnail: z.string().startsWith('/img/'),
    images: z.array(z.string().startsWith('/img/')).min(1),
    imageColumns: z.union([z.literal(1), z.literal(2)]).default(1),
    tools: z.array(z.string()).min(1),
  }),
});

export const collections = { portfolio };
```

- [ ] **Step 4: Create all 15 entries**

Use this exact template. `imageColumns` is omitted where it is `1` (the schema default).

`src/content/portfolio/myads.md`:

```markdown
---
title: MyAds
order: 1
thumbnail: /img/portfolio/myads.jpg
images:
  - /img/portfolio/myads.jpg
tools:
  - jQuery
  - Adobe Flex
---

Self serve ad platform
```

`src/content/portfolio/stats-lab.md` — the multi-image, two-column shape:

```markdown
---
title: Stats Lab
order: 5
thumbnail: /img/portfolio/statslab.jpg
images:
  - /img/portfolio/statslab-2.jpg
  - /img/portfolio/statslab-3.jpg
  - /img/portfolio/statslab-4.jpg
  - /img/portfolio/statslab-5.jpg
imageColumns: 2
tools:
  - YUI3
  - SASS
  - Compass
  - THREE.js
---

Google sponsored NFL stats lab
```

Create the remaining 13 from this table. Every value is verbatim from the original `index.html`; do not correct spelling or reorder anything. All image paths are prefixed `/img/portfolio/`.

| order | filename | title | thumbnail | images | imageColumns | tools | body (description) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `myads.md` | MyAds | `myads.jpg` | `myads.jpg` | 1 | jQuery / Adobe Flex | Self serve ad platform |
| 2 | `hyper-targeting-confusion-matrix.md` | Hyper Targeting Confusion Matrix | `htcm.jpg` | `htcm.jpg` | 1 | Adobe Flex | Internal tools for marketing team to analyze MySpace user targeting |
| 3 | `nfl-schedules-page.md` | NFL Schedules page | `schedules.jpg` | `schedules.jpg` | 1 | YUI3 Graphics / SASS / Compass | Redesigned NFL schedules page with SVG graphics voting tool |
| 4 | `nfl-gamecenter.md` | NFL Gamecenter | `gamecenter.jpg` | `drivechart.gif` | 1 | YUI3 Graphics / SASS / Compass | NFL gamecenter page with live drivechart |
| 5 | `stats-lab.md` | Stats Lab | `statslab.jpg` | `statslab-2.jpg`, `statslab-3.jpg`, `statslab-4.jpg`, `statslab-5.jpg` | **2** | YUI3 / SASS / Compass / THREE.js | Google sponsored NFL stats lab |
| 6 | `playstation-4.md` | PlayStation 4 | `ps4.jpg` | `ps4.png` | 1 | React / WebMAF SDK / GraphQL | NFL PS4 App |
| 7 | `appletv.md` | AppleTV | `appletv.jpg` | `appletv-l.jpg` | 1 | Java / Gradle / Gulp / Webpack / Babel / GraphQL | NFL AppleTV App |
| 8 | `superbowl-live.md` | Superbowl Live | `sblive.jpg` | `sblive.jpg` | 1 | React / MobX / Adobe Primetime | Live event page for Superbowl |
| 9 | `fantasy-live-console.md` | Fantasy Live Console | `fflive-console.jpg` | `fflive-console.jpg` | 1 | NodeJS / NPM / Gulp / Backbone / Bootstrap / Mocha | Internal console application built with NodeJS |
| 10 | `data-viz-prototypes.md` | Data Viz Prototypes | `d3.jpg` | `depthchart.jpg`, `drivechart.jpg`, `team.jpg` | **2** | D3.js | Interactive data visualization prototypes using D3.js |
| 11 | `espn-plus.md` | ESPN+ | `espn-web.jpg` | `espn-web.webp` | 1 | React SSR / NodeJS / Mencached / GraphQL / VideoJS | ESPN+ integrated with ESPN Watch |
| 12 | `watch-espn.md` | Watch ESPN | `espn-web-player.jpg` | `espn-web-player.webp` | 1 | VideoJS / Brightcove | ESPN Web Video Player |
| 13 | `shopify.md` | Shopify | `kanopi-landing.jpg` | `kanopi-landing.webp`, `kanopi-pd.webp` | **2** | Shopify / ThemeKit / Liquid / Github Action | Ceiling Tiles Shopping Site |
| 14 | `android-app.md` | Android App | `chordx-android-app-2.jpg` | `chordx-android-app-1.webp`, `chordx-android-app-2.webp`, `chordx-console.webp` | 1 | React Native / Apollo GraphQL / Azure IoT Hub | Marine Diesel Engine Monitoring App |
| 15 | `ticket-search.md` | Ticket Search | `axs-seat-map-crypto.jpg` | `axs-seat-map-crypto.webp`, `axs-seat-map-lagalaxy.webp`, `axs-seat-map-3d.webp` | 1 | React / NodeJS / Express / AWS CodeBuild / DynamoDB / SSM / Spinnaker | New AXS Ticket Search Page |

`tools` values are separated by `/` in this table for readability — each becomes a separate YAML list item, in the order shown. Item 11's `Mencached` is intentional.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:content && npm run build`
Expected: both content tests pass, and the build succeeds — which proves the Zod schema accepted all 15 entries. A Zod error names the offending file and field.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content/portfolio tests/content-files.check.mjs
git commit -m "feat: add portfolio content collection with 15 validated entries"
```

---

## Task 5: Design tokens, fonts, and global CSS

**Files:**
- Create: `src/styles/global.css`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind theme tokens `--color-brand-primary`, `--color-brand-success`, `--color-navbar-active`, `--color-btn-default`, `--font-heading`, `--font-body`; breakpoints `sm`/`md`/`lg` remapped to Bootstrap 3 values; utility class `container`; component classes `star-divider`, `star-divider--light`, `star-divider--primary`. Every later component uses these.

- [ ] **Step 1: Create `src/styles/global.css`**

```css
@import 'tailwindcss';

/* Self-hosted — replaces the blocked http:// Google Fonts requests */
@import '@fontsource/montserrat/400.css';
@import '@fontsource/montserrat/700.css';
@import '@fontsource/lato/400.css';
@import '@fontsource/lato/400-italic.css';
@import '@fontsource/lato/700.css';
@import '@fontsource/lato/700-italic.css';

@theme {
  /* Bootstrap 3 breakpoints — required for layout fidelity */
  --breakpoint-sm: 768px;
  --breakpoint-md: 992px;
  --breakpoint-lg: 1200px;

  /* Bootswatch Flatly */
  --color-brand-primary: #2c3e50;
  --color-brand-success: #18bc9c;
  --color-navbar-active: #1a242f;
  --color-btn-default: #95a5a6;

  --font-heading: Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-body: Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

@layer base {
  body {
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.42857143;
    color: var(--color-brand-primary);
    background-color: #fff;
    overflow-x: hidden;
  }

  p {
    font-size: 20px;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    font-weight: 700;
    text-transform: uppercase;
  }

  /* Replaces the 1500ms jQuery easing scroll; honors reduced-motion for free */
  html {
    scroll-behavior: smooth;
  }

  :target {
    scroll-margin-top: 70px;
  }
}

/* Bootstrap 3 container widths */
@utility container {
  margin-inline: auto;
  padding-inline: 15px;
  @media (width >= 768px) { width: 750px; }
  @media (width >= 992px) { width: 970px; }
  @media (width >= 1200px) { width: 1170px; }
}

/*
 * Star divider: a 5px rule with a star glyph masking its centre.
 * Utilities cannot express the overlapping ::after mask, so it stays as CSS.
 */
.star-divider {
  position: relative;
  max-width: 250px;
  margin: 25px auto 30px;
  padding: 0;
  border: none;
  border-top: solid 5px;
  text-align: center;
}

.star-divider__icon {
  display: inline-block;
  position: relative;
  top: -0.8em;
  padding: 0 0.25em;
  font-size: 2em;
  line-height: 1;
}

.star-divider__icon svg {
  width: 1em;
  height: 1em;
  vertical-align: middle;
}

.star-divider--light {
  border-color: #fff;
}

.star-divider--light .star-divider__icon {
  background-color: var(--color-brand-success);
  color: #fff;
}

.star-divider--primary {
  border-color: var(--color-brand-primary);
}

.star-divider--primary .star-divider__icon {
  background-color: #fff;
  color: var(--color-brand-primary);
}
```

- [ ] **Step 2: Import the stylesheet so it compiles**

Replace `src/pages/index.astro` with:

```astro
---
import '../styles/global.css';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Portfolio - Takashi Aoki</title>
  </head>
  <body>
    <p>tokens</p>
  </body>
</html>
```

- [ ] **Step 3: Write the failing test — tokens and fonts must reach the build output**

Create `tests/styles.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('Flatly palette and Bootstrap 3 breakpoints are compiled into the CSS', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('link[rel=stylesheet]').evaluateAll(
    (links) => links.map((l) => (l as HTMLLinkElement).getAttribute('href')!),
  );
  expect(hrefs.length).toBeGreaterThan(0);

  let css = '';
  for (const href of hrefs) {
    css += await (await request.get(href)).text();
  }

  expect(css).toContain('#18bc9c');
  expect(css).toContain('#2c3e50');
  expect(css).toContain('768px');
  expect(css).toContain('992px');
  expect(css).toContain('1200px');
  expect(css).toContain('1.42857143');
});

test('Montserrat and Lato are self-hosted, with no external font request', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const families = await page.evaluate(() =>
    [...document.fonts].map((f) => f.family.replaceAll('"', '')),
  );
  expect(families).toContain('Montserrat');
  expect(families).toContain('Lato');

  expect(requested.filter((u) => u.includes('fonts.googleapis.com'))).toEqual([]);
  expect(requested.filter((u) => u.startsWith('http://'))).toEqual([]);
});
```

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/styles.spec.ts`
Expected: 2 passed. If `document.fonts` is empty, the `@fontsource` imports are not being pulled in — confirm `global.css` is imported by the page.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/index.astro tests/styles.spec.ts
git commit -m "feat: add Tailwind theme tokens, self-hosted fonts, and star divider"
```

---

## Task 6: Layout shell, icons, star divider, and hero

**Files:**
- Create: `src/components/icons/star-path.ts`, `Star.astro`, `SearchPlus.astro`, `Download.astro`, `ChevronUp.astro`, `LinkedIn.astro`, `GitHub.astro`, `Times.astro`; `src/components/StarDivider.astro`; `src/layouts/BaseLayout.astro`; `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `star-divider*` classes and tokens from Task 5.
- Produces: `BaseLayout.astro` accepting `{ title: string }` and a default `<slot />`, rendering `<head>` and a `[data-nav-sentinel]` element 300px from the top of the document (Task 9 observes it). `StarDivider.astro` accepting `{ variant: 'light' | 'primary' }`. Icon components take no props. `STAR_PATH`, a `string` exported from `src/components/icons/star-path.ts`, consumed by Task 8's island.

- [ ] **Step 1: Create the seven inline SVG icons**

All use `currentColor` and `aria-hidden`, since each is decorative and sits beside a text label or an accessible name.

The star is the one icon needed by both an Astro component and a Preact island, so its path lives in a shared constant rather than being written twice.

`src/components/icons/star-path.ts`:

```ts
export const STAR_PATH =
  'M1728 647q0 22-26 48l-363 354 86 500q1 7 1 20 0 50-41 50-19 0-40-12l-449-236-449 236q-22 12-40 12-42 0-42-50 0-13 2-20l86-500-364-354q-25-27-25-48 0-37 56-46l502-73 225-455q19-41 49-41t49 41l225 455 502 73q56 9 56 46z';
```

`src/components/icons/Star.astro`:

```astro
---
import { STAR_PATH } from './star-path';
---

<svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true"><path d={STAR_PATH} /></svg>
```

`src/components/icons/SearchPlus.astro`:

```astro
<svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true"><path d="M1216 832q0 26-19 45t-45 19h-224v224q0 26-19 45t-45 19h-128q-26 0-45-19t-19-45v-224h-224q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h224v-224q0-26 19-45t45-19h128q26 0 45 19t19 45v224h224q26 0 45 19t19 45v128zm-256 384q0-159-112.5-271.5t-271.5-112.5-271.5 112.5-112.5 271.5 112.5 271.5 271.5 112.5 271.5-112.5 112.5-271.5zm768 672q0 53-37.5 90.5t-90.5 37.5q-54 0-90-38l-343-342q-179 124-399 124-143 0-273.5-55.5t-225-150-150-225-55.5-273.5 55.5-273.5 150-225 225-150 273.5-55.5 273.5 55.5 225 150 150 225 55.5 273.5q0 220-124 399l343 343q37 37 37 90z" transform="translate(0 -64)"/></svg>
```

`src/components/icons/Download.astro`:

```astro
<svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true"><path d="M1344 1344q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm256 0q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm128-224v320q0 40-28 68t-68 28h-1472q-40 0-68-28t-28-68v-320q0-40 28-68t68-28h427l93 93q58 56 136 56t136-56l93-93h427q40 0 68 28t28 68zm-325-635q17 41-14 70l-448 448q-18 19-45 19t-45-19l-448-448q-31-29-14-70 17-39 59-39h256v-448q0-26 19-45t45-19h256q26 0 45 19t19 45v448h256q42 0 59 39z"/></svg>
```

`src/components/icons/ChevronUp.astro`:

```astro
<svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true"><path d="M1683 1331l-166 165q-19 19-45 19t-45-19l-531-531-531 531q-19 19-45 19t-45-19l-166-165q-19-19-19-45.5t19-45.5l742-741q19-19 45-19t45 19l742 741q19 19 19 45.5t-19 45.5z"/></svg>
```

`src/components/icons/Times.astro`:

```astro
<svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true"><path d="M1490 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z"/></svg>
```

`src/components/icons/LinkedIn.astro`:

```astro
<svg viewBox="0 0 1536 1792" fill="currentColor" aria-hidden="true"><path d="M349 625v991h-330v-991h330zm21-306q1 73-50.5 122t-135.5 49h-2q-82 0-132-49t-50-122q0-74 51.5-122.5t134.5-48.5 133 48.5 51 122.5zm1166 729v568h-329v-530q0-105-40.5-164.5t-126.5-59.5q-63 0-105.5 34.5t-63.5 85.5q-11 30-11 81v553h-329q2-399 2-647t-1-296l-1-48h329v144h-2q20-32 41-56 63-70 171-70 173 0 278 114.5t105 335.5z"/></svg>
```

`src/components/icons/GitHub.astro`:

```astro
<svg viewBox="0 0 1664 1792" fill="currentColor" aria-hidden="true"><path d="M519 1394q4-6-8-10-15-4-18 2-4 6 8 10 14 6 18-2zm46 42q9-8-3-18-12-8-19-1-9 8 3 18 12 10 19 1zm45 61q12-8 0-24-9-16-21-8-12 7 0 23t21 9zm62 63q11-11-5-26-15-16-27-3-13 11 4 27 16 15 28 2zm86 36q4-15-19-21-22-6-27 9t19 20q22 7 27-8zm94 8q0-18-24-16-23 0-23 16 0 18 24 17 23-1 23-17zm88-15q-3-15-26-11-24 5-21 20t26 10 21-19zm430-459q0 236-136 356-133 118-380 118-247 0-380-118-136-120-136-356 0-141 74-256-16-40-16-84 0-56 24-105 52 0 96 21t85 61q79-19 168-19 90 0 170 19 40-39 85-60t95-22q26 50 26 106 0 43-16 83 74 115 74 256z" transform="translate(0 -64)"/></svg>
```

- [ ] **Step 2: Create `src/components/StarDivider.astro`**

```astro
---
import Star from './icons/Star.astro';

interface Props {
  variant: 'light' | 'primary';
}

const { variant } = Astro.props;
---

<div class={`star-divider star-divider--${variant}`} role="presentation">
  <span class="star-divider__icon"><Star /></span>
</div>
```

- [ ] **Step 3: Create `src/layouts/BaseLayout.astro`**

The `data-nav-sentinel` element sits exactly 300px down the page. Task 9 observes it to reproduce the original navbar shrink threshold without a scroll handler.

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <link rel="icon" href="/img/notion.svg" />
    <meta name="description" content="" />
    <meta name="author" content="" />
    <title>{title}</title>
  </head>
  <body id="page-top" class="relative">
    <div
      data-nav-sentinel
      aria-hidden="true"
      class="pointer-events-none absolute top-[300px] left-0 h-px w-px"
    >
    </div>
    <slot />
  </body>
</html>
```

- [ ] **Step 4: Create `src/components/Hero.astro`**

The original centred its intro paragraph with empty `col-sm-4` spacer spans; a centred max-width block is visually equivalent.

```astro
---
import StarDivider from './StarDivider.astro';

const AVATAR =
  'https://en.gravatar.com/userimage/34773047/5aaac04f99bf0a9a39cd748c6a4023ec.jpg?size=256';
---

<header class="bg-brand-success text-center text-white">
  <div class="container pt-[100px] pb-[50px] sm:pt-[200px] sm:pb-[100px]">
    <img src={AVATAR} alt="" class="mx-auto mb-5 block h-auto max-w-full rounded-full" />
    <div>
      <span class="block font-heading text-[2em] font-bold uppercase sm:text-[4.75em]">
        Takashi Aoki
      </span>
      <StarDivider variant="light" />
      <span class="text-[1.25em] font-light sm:text-[1.75em]">Software Engineer</span>
      <p class="mx-auto mt-4 max-w-[33%] text-[15px] max-sm:max-w-full">
        An accomplished detail-oriented application developer with 20+ years of professional
        experience in software engineering.
      </p>
    </div>
  </div>
</header>
```

- [ ] **Step 5: Wire the hero into the page**

Replace `src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
---

<BaseLayout title="Portfolio - Takashi Aoki">
  <Hero />
</BaseLayout>
```

- [ ] **Step 6: Write the failing test**

Create `tests/hero.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('head metadata matches the original', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Portfolio - Takashi Aoki');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', '/img/notion.svg');
});

test('hero renders name, title, intro, and avatar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Takashi Aoki', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Software Engineer')).toBeVisible();
  await expect(
    page.getByText(
      'An accomplished detail-oriented application developer with 20+ years of professional experience in software engineering.',
    ),
  ).toBeVisible();
  await expect(page.locator('header img')).toHaveAttribute(
    'src',
    /en\.gravatar\.com\/userimage\/34773047/,
  );
});

test('the hero star divider is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header .star-divider--light svg')).toBeVisible();
});
```

- [ ] **Step 7: Run the tests**

Run: `npx playwright test tests/hero.spec.ts`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add src/components src/layouts src/pages/index.astro tests/hero.spec.ts
git commit -m "feat: add layout shell, inline SVG icons, star divider, and hero"
```

---

## Task 7: Static portfolio grid

**Files:**
- Create: `src/components/PortfolioGrid.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection('portfolio')` from Task 4; `SearchPlus` icon and `StarDivider` from Task 6.
- Produces: 15 `<button data-portfolio-tile data-portfolio-index={n}>` elements in `order` sequence, where `n` is the zero-based index. Task 8's modal island binds to these attributes.

- [ ] **Step 1: Create `src/components/PortfolioGrid.astro`**

```astro
---
import { getCollection } from 'astro:content';
import StarDivider from './StarDivider.astro';
import SearchPlus from './icons/SearchPlus.astro';

const items = (await getCollection('portfolio')).sort((a, b) => a.data.order - b.data.order);
---

<section id="portfolio" class="py-[75px] sm:py-[100px]">
  <div class="container">
    <div class="text-center">
      <h2 class="m-0 text-[3em]">Portfolio</h2>
      <StarDivider variant="primary" />
    </div>

    <div class="flex flex-wrap">
      {
        items.map((item, index) => (
          <div class="mb-[15px] w-full px-[15px] sm:mb-[30px] sm:w-1/3">
            <button
              type="button"
              data-portfolio-tile
              data-portfolio-index={index}
              aria-label={`View details for ${item.data.title}`}
              class="group relative mx-auto block w-full max-w-[400px] cursor-pointer border-0 bg-transparent p-0"
            >
              <span
                class="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(24,188,156,0.9)] opacity-0 transition-all duration-500 ease-linear group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span class="text-[3em] text-white"><SearchPlus /></span>
              </span>
              <img src={item.data.thumbnail} alt="" class="block h-auto w-full" />
            </button>
          </div>
        ))
      }
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the grid to the page**

Replace `src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import PortfolioGrid from '../components/PortfolioGrid.astro';
---

<BaseLayout title="Portfolio - Takashi Aoki">
  <Hero />
  <PortfolioGrid />
</BaseLayout>
```

- [ ] **Step 3: Write the failing test**

Create `tests/grid.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const EXPECTED_THUMBNAILS = [
  '/img/portfolio/myads.jpg',
  '/img/portfolio/htcm.jpg',
  '/img/portfolio/schedules.jpg',
  '/img/portfolio/gamecenter.jpg',
  '/img/portfolio/statslab.jpg',
  '/img/portfolio/ps4.jpg',
  '/img/portfolio/appletv.jpg',
  '/img/portfolio/sblive.jpg',
  '/img/portfolio/fflive-console.jpg',
  '/img/portfolio/d3.jpg',
  '/img/portfolio/espn-web.jpg',
  '/img/portfolio/espn-web-player.jpg',
  '/img/portfolio/kanopi-landing.jpg',
  '/img/portfolio/chordx-android-app-2.jpg',
  '/img/portfolio/axs-seat-map-crypto.jpg',
];

test('renders 15 tiles with the original thumbnails in the original order', async ({ page }) => {
  await page.goto('/');
  const tiles = page.locator('[data-portfolio-tile]');
  await expect(tiles).toHaveCount(15);

  const srcs = await tiles.locator('img').evaluateAll((imgs) =>
    imgs.map((i) => new URL((i as HTMLImageElement).src).pathname),
  );
  expect(srcs).toEqual(EXPECTED_THUMBNAILS);
});

test('every thumbnail actually loads', async ({ page }) => {
  await page.goto('/');
  const broken = await page.locator('[data-portfolio-tile] img').evaluateAll((imgs) =>
    imgs.filter((i) => !(i as HTMLImageElement).naturalWidth).map((i) => (i as HTMLImageElement).src),
  );
  expect(broken).toEqual([]);
});

test('tiles are keyboard-reachable buttons with accessible names', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-portfolio-tile]').first()).toHaveAttribute(
    'aria-label',
    'View details for MyAds',
  );
});
```

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/grid.spec.ts`
Expected: 3 passed. A mismatch in the order array means an `order` value in Task 4 is wrong.

- [ ] **Step 5: Commit**

```bash
git add src/components/PortfolioGrid.astro src/pages/index.astro tests/grid.spec.ts
git commit -m "feat: add static portfolio grid with CSS hover captions"
```

---

## Task 8: Portfolio modal island

**Files:**
- Create: `src/components/PortfolioModal.tsx`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `data-portfolio-index` buttons from Task 7; collection data from Task 4.
- Produces: a `<dialog data-portfolio-dialog>` containing `[data-modal-title]`, `[data-modal-image]` (one per image), `[data-modal-description]`, and `[data-modal-tools]`. Task 11's parity test reads these attributes.

Exported prop type:

```ts
export interface PortfolioModalItem {
  title: string;
  images: string[];
  imageColumns: 1 | 2;
  tools: string[];
  description: string;
}
```

- [ ] **Step 1: Create `src/components/PortfolioModal.tsx`**

Uses the native `<dialog>` element, which supplies Esc-to-close, the backdrop, and focus trapping — the behaviors that previously required Bootstrap's modal plugin.

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { STAR_PATH } from './icons/star-path';

export interface PortfolioModalItem {
  title: string;
  images: string[];
  imageColumns: 1 | 2;
  tools: string[];
  description: string;
}

interface Props {
  items: PortfolioModalItem[];
}

export default function PortfolioModal({ items }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Open via delegation so the 15 tiles can stay static server-rendered HTML.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-portfolio-index]',
      );
      if (!tile) return;
      triggerRef.current = tile;
      setIndex(Number(tile.dataset.portfolioIndex));
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (index === null) {
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
      triggerRef.current?.focus();
      triggerRef.current = null;
      return;
    }

    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
  }, [index]);

  const close = () => setIndex(null);
  const item = index === null ? null : items[index];

  return (
    <dialog
      ref={dialogRef}
      data-portfolio-dialog
      aria-modal="true"
      aria-label={item ? item.title : undefined}
      onClose={close}
      onClick={(event) => {
        // A click landing on the dialog itself is a backdrop click.
        if (event.target === dialogRef.current) close();
      }}
      class="m-0 h-full max-h-none w-full max-w-none border-0 bg-white p-0 text-brand-primary backdrop:bg-black/50"
    >
      {item && (
        <div class="relative min-h-full py-[100px] text-center">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            class="absolute top-[25px] right-[25px] h-[75px] w-[75px] cursor-pointer border-0 bg-transparent hover:opacity-30"
          >
            <span class="relative left-[35px] block h-[75px] w-px rotate-45 bg-brand-primary">
              <span class="block h-[75px] w-px rotate-90 bg-brand-primary"></span>
            </span>
          </button>

          <div class="container">
            <div class="mx-auto md:w-2/3">
              <h2 data-modal-title class="m-0 text-[3em]">
                {item.title}
              </h2>
              <div class="star-divider star-divider--primary" role="presentation">
                <span class="star-divider__icon">
                  <svg viewBox="0 0 1792 1792" fill="currentColor" aria-hidden="true">
                    <path d={STAR_PATH} />
                  </svg>
                </span>
              </div>

              <div class="flex flex-wrap justify-center">
                {item.images.map((src) => (
                  <div
                    key={src}
                    class={item.imageColumns === 2 ? 'w-full px-[15px] sm:w-1/2' : 'w-full px-[15px]'}
                  >
                    <img
                      data-modal-image
                      src={src}
                      alt=""
                      class="mx-auto mb-[30px] block h-auto max-w-full"
                    />
                  </div>
                ))}
              </div>

              <p data-modal-description>{item.description}</p>

              <ul class="my-[30px] list-none p-0">
                <li>
                  Tools: <strong data-modal-tools>{item.tools.join(', ')}</strong>
                </li>
              </ul>

              <button
                type="button"
                onClick={close}
                class="cursor-pointer border-0 bg-btn-default px-4 py-2 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 2: Mount the island**

Replace `src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import PortfolioGrid from '../components/PortfolioGrid.astro';
import PortfolioModal from '../components/PortfolioModal.tsx';

const entries = (await getCollection('portfolio')).sort((a, b) => a.data.order - b.data.order);

const modalItems = entries.map((entry) => ({
  title: entry.data.title,
  images: entry.data.images,
  imageColumns: entry.data.imageColumns,
  tools: entry.data.tools,
  description: entry.body!.trim(),
}));
---

<BaseLayout title="Portfolio - Takashi Aoki">
  <Hero />
  <PortfolioGrid />
  <PortfolioModal items={modalItems} client:visible />
</BaseLayout>
```

- [ ] **Step 3: Write the failing test**

Create `tests/modal.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('clicking a tile opens the dialog with that project', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();

  const dialog = page.locator('dialog[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('[data-modal-title]')).toHaveText('MyAds');
  await expect(dialog.locator('[data-modal-description]')).toHaveText('Self serve ad platform');
  await expect(dialog.locator('[data-modal-tools]')).toHaveText('jQuery, Adobe Flex');
});

test('a multi-image project renders every image', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').nth(4).click(); // Stats Lab

  const dialog = page.locator('dialog[data-portfolio-dialog]');
  await expect(dialog.locator('[data-modal-title]')).toHaveText('Stats Lab');
  await expect(dialog.locator('[data-modal-image]')).toHaveCount(4);
});

test('Escape closes the dialog', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  await expect(page.locator('dialog[data-portfolio-dialog]')).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
});

test('the Close button closes the dialog', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('dialog[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
});

test('focus returns to the triggering tile on close', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[data-portfolio-tile]').nth(2);
  await tile.click();
  await page.keyboard.press('Escape');

  const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  expect(label).toBe('View details for NFL Schedules page');
});

test('body scroll is locked while open and restored on close', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});
```

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/modal.spec.ts`
Expected: 6 passed. If the dialog never opens, the island has not hydrated — confirm `client:visible` and that the grid is in the viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/PortfolioModal.tsx src/pages/index.astro tests/modal.spec.ts
git commit -m "feat: add portfolio modal island using native dialog"
```

---

## Task 9: Navbar island

**Files:**
- Create: `src/components/Navbar.tsx`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `[data-nav-sentinel]` from Task 6; section ids `#portfolio` and `#about`.
- Produces: `<nav data-navbar>` gaining class `navbar-shrink` past 300px; `[data-nav-toggle]` button; `[data-nav-menu]` collapsible menu; active link marked `aria-current="page"`.

- [ ] **Step 1: Create `src/components/Navbar.tsx`**

```tsx
import { useEffect, useState } from 'preact/hooks';

const LINKS = [
  { href: '#portfolio', label: 'Portfolio', id: 'portfolio' },
  { href: '#about', label: 'About', id: 'about' },
];

export default function Navbar() {
  const [shrink, setShrink] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Reproduces the original 300px shrink threshold without a scroll handler.
  useEffect(() => {
    const sentinel = document.querySelector('[data-nav-sentinel]');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShrink(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      data-navbar
      data-shrink={shrink ? 'true' : 'false'}
      class={`fixed top-0 right-0 left-0 z-[1050] bg-brand-primary font-heading font-bold uppercase transition-[padding] duration-300 ${
        shrink ? 'navbar-shrink sm:py-[10px]' : 'sm:py-[25px]'
      }`}
    >
      <div class="container flex flex-wrap items-center justify-between py-2 sm:py-0">
        <a
          href="#page-top"
          class={`text-white transition-all duration-300 hover:text-brand-success ${
            shrink ? 'sm:text-[1.5em]' : 'sm:text-[2em]'
          }`}
        >
          Takashi Aoki
        </a>

        <button
          type="button"
          data-nav-toggle
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          class="cursor-pointer border-2 border-navbar-active bg-transparent px-3 py-2 sm:hidden"
        >
          <span class="mb-1 block h-px w-[22px] bg-white"></span>
          <span class="mb-1 block h-px w-[22px] bg-white"></span>
          <span class="block h-px w-[22px] bg-white"></span>
        </button>

        <div
          id="nav-menu"
          data-nav-menu
          class={`w-full sm:block sm:w-auto ${open ? 'block' : 'hidden'}`}
        >
          <ul class="flex flex-col tracking-[1px] sm:flex-row">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={active === link.id ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  class={`block px-4 py-3 text-white hover:text-brand-success ${
                    active === link.id ? 'bg-navbar-active' : ''
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Mount the island**

Add to `src/pages/index.astro` — import it and place it as the first child inside `BaseLayout`, before `<Hero />`:

```astro
import Navbar from '../components/Navbar.tsx';
```

```astro
<BaseLayout title="Portfolio - Takashi Aoki">
  <Navbar client:idle />
  <Hero />
  <PortfolioGrid />
  <PortfolioModal items={modalItems} client:visible />
</BaseLayout>
```

- [ ] **Step 3: Write the failing test**

Create `tests/navbar.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('navbar shrinks past 300px and expands back', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav[data-navbar]');
  await expect(nav).toHaveAttribute('data-shrink', 'false');

  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(nav).toHaveAttribute('data-shrink', 'true');

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav).toHaveAttribute('data-shrink', 'false');
});

test('brand and nav links are present', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav[data-navbar]');
  await expect(nav.getByRole('link', { name: 'Takashi Aoki' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '#portfolio');
  await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
});

test('mobile menu toggles and auto-closes on link click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');

  const menu = page.locator('[data-nav-menu]');
  const toggle = page.locator('[data-nav-toggle]');
  await expect(menu).toBeHidden();

  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await menu.getByRole('link', { name: 'Portfolio' }).click();
  await expect(menu).toBeHidden();
});

test('scrollspy marks the section in view', async ({ page }) => {
  await page.goto('/');
  await page.locator('#portfolio').scrollIntoViewIfNeeded();
  await expect(
    page.locator('nav[data-navbar]').getByRole('link', { name: 'Portfolio' }),
  ).toHaveAttribute('aria-current', 'page');
});
```

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/navbar.spec.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/pages/index.astro tests/navbar.spec.ts
git commit -m "feat: add navbar island with shrink, mobile toggle, and scrollspy"
```

---

## Task 10: About, footer, and scroll-to-top

**Files:**
- Create: `src/components/About.astro`, `src/components/Footer.astro`, `src/components/ScrollTop.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `StarDivider`, `Download`, `ChevronUp`, `LinkedIn`, `GitHub` from Task 6.
- Produces: section `#about`; the final page composition. Nothing depends on this task.

- [ ] **Step 1: Create `src/components/About.astro`**

The original layout is deliberately asymmetric: a narrow left-aligned paragraph over a centred button. Reproduce it.

```astro
---
import StarDivider from './StarDivider.astro';
import Download from './icons/Download.astro';
---

<section id="about" class="bg-brand-success py-[75px] text-white sm:py-[100px]">
  <div class="container">
    <div class="text-center">
      <h2 class="m-0 text-[3em]">About</h2>
      <StarDivider variant="light" />
    </div>

    <div class="flex flex-wrap">
      <div class="w-full lg:ml-[33.333333%] lg:w-1/3">
        <p>
          Professional Web/Application Developer with experiences of developing high performance
          Websites / Rich Internet Application.
        </p>
      </div>
      <div class="w-full text-center lg:ml-[16.666667%] lg:w-2/3">
        <a
          href="/docs/Takashi%20Aoki.docx"
          class="mt-[15px] inline-block border-2 border-white bg-transparent px-[18px] py-[10px] text-[20px] text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-brand-success"
        >
          <span class="inline-block h-[1em] w-[1em] align-middle"><Download /></span> Download Resume
        </a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create `src/components/Footer.astro`**

```astro
---
import LinkedIn from './icons/LinkedIn.astro';
import GitHub from './icons/GitHub.astro';

const SOCIAL = [
  { href: 'https://www.linkedin.com/in/taak77', label: 'LinkedIn', Icon: LinkedIn },
  { href: 'https://github.com/taak77', label: 'GitHub', Icon: GitHub },
];
---

<footer class="bg-brand-primary pt-[50px] text-center text-white">
  <div class="container">
    <h3 class="mb-[30px]">Around the Web</h3>
    <ul class="mb-[50px] flex list-none justify-center gap-[10px] p-0">
      {
        SOCIAL.map(({ href, label, Icon }) => (
          <li>
            <a
              href={href}
              aria-label={label}
              class="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 border-white text-[20px] text-white transition-all duration-300 hover:bg-white hover:text-brand-primary"
            >
              <span class="inline-block h-[1em] w-[1em]"><Icon /></span>
            </a>
          </li>
        ))
      }
    </ul>
  </div>
</footer>
```

- [ ] **Step 3: Create `src/components/ScrollTop.astro`**

Shown below 768px only. This also fixes the original's `visble-sm` typo, which silently did nothing.

```astro
---
import ChevronUp from './icons/ChevronUp.astro';
---

<div class="fixed right-[2%] bottom-[2%] z-[1049] sm:hidden" data-scroll-top>
  <a
    href="#page-top"
    aria-label="Back to top"
    class="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-brand-primary text-[20px] text-white"
  >
    <span class="inline-block h-[1em] w-[1em]"><ChevronUp /></span>
  </a>
</div>
```

- [ ] **Step 4: Complete the page composition**

Replace `src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Navbar from '../components/Navbar.tsx';
import Hero from '../components/Hero.astro';
import PortfolioGrid from '../components/PortfolioGrid.astro';
import PortfolioModal from '../components/PortfolioModal.tsx';
import About from '../components/About.astro';
import Footer from '../components/Footer.astro';
import ScrollTop from '../components/ScrollTop.astro';

const entries = (await getCollection('portfolio')).sort((a, b) => a.data.order - b.data.order);

const modalItems = entries.map((entry) => ({
  title: entry.data.title,
  images: entry.data.images,
  imageColumns: entry.data.imageColumns,
  tools: entry.data.tools,
  description: entry.body!.trim(),
}));
---

<BaseLayout title="Portfolio - Takashi Aoki">
  <Navbar client:idle />
  <Hero />
  <PortfolioGrid />
  <About />
  <Footer />
  <ScrollTop />
  <PortfolioModal items={modalItems} client:visible />
</BaseLayout>
```

- [ ] **Step 5: Write the failing test**

Create `tests/sections.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('about section matches the original copy and resume link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about h2')).toHaveText('About');
  await expect(
    page.getByText(
      'Professional Web/Application Developer with experiences of developing high performance Websites / Rich Internet Application.',
    ),
  ).toBeVisible();

  const resume = page.getByRole('link', { name: /Download Resume/ });
  await expect(resume).toHaveAttribute('href', '/docs/Takashi%20Aoki.docx');
});

test('the resume file is actually downloadable', async ({ request }) => {
  const response = await request.get('/docs/Takashi%20Aoki.docx');
  expect(response.status()).toBe(200);
});

test('footer links to LinkedIn and GitHub', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer h3')).toHaveText('Around the Web');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/taak77',
  );
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/taak77',
  );
});

test('scroll-to-top shows on mobile and hides on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('[data-scroll-top]')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('[data-scroll-top]')).toBeHidden();
});
```

- [ ] **Step 6: Run the tests**

Run: `npx playwright test tests/sections.spec.ts`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add src/components/About.astro src/components/Footer.astro src/components/ScrollTop.astro src/pages/index.astro tests/sections.spec.ts
git commit -m "feat: add about section, footer, and scroll-to-top"
```

---

## Task 11: Content parity against the frozen legacy page

**Files:**
- Create: `tests/parity.spec.ts`

**Interfaces:**
- Consumes: `tests/fixtures/legacy-index.html` from Task 2; all rendered markup and `data-modal-*` attributes from Tasks 7-10.
- Produces: nothing consumed downstream. This is the gate that proves the port dropped nothing.

This is the most important test in the suite. Visual comparison cannot catch a dropped comma in a tools list or a missing fourth screenshot; this can.

- [ ] **Step 1: Write the test**

Create `tests/parity.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

interface Item {
  thumbnail: string;
  title: string;
  images: string[];
  description: string;
  tools: string;
}

const LEGACY_URL = pathToFileURL(resolve('tests/fixtures/legacy-index.html')).href;

/** Extracts the 15 projects from the frozen original page. */
async function readLegacy(page: import('@playwright/test').Page): Promise<Item[]> {
  await page.goto(LEGACY_URL);
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#portfolio a.portfolio-link')];
    return tiles.map((tile) => {
      const id = tile.getAttribute('href')!.slice(1);
      const body = document.getElementById(id)!.querySelector('.modal-body')!;
      return {
        thumbnail: tile.querySelector('img')!.getAttribute('src')!.replace(/^/, '/'),
        title: body.querySelector('h2')!.textContent!.trim(),
        images: [...body.querySelectorAll('img')].map(
          (img) => '/' + img.getAttribute('src')!,
        ),
        description: body.querySelector('p')!.textContent!.trim(),
        tools: body.querySelector('ul.item-details strong')!.textContent!.trim(),
      };
    });
  });
}

test('the rewrite reproduces all 15 projects exactly', async ({ page }) => {
  const legacy = await readLegacy(page);
  expect(legacy).toHaveLength(15);

  await page.goto('/');
  const tiles = page.locator('[data-portfolio-tile]');
  await expect(tiles).toHaveCount(15);

  // Thumbnails, in order, without opening anything.
  const thumbnails = await tiles.locator('img').evaluateAll((imgs) =>
    imgs.map((i) => new URL((i as HTMLImageElement).src).pathname),
  );
  expect(thumbnails).toEqual(legacy.map((item) => item.thumbnail));

  // Open each project and compare its modal content field by field.
  for (const [index, expected] of legacy.entries()) {
    await tiles.nth(index).click();
    const dialog = page.locator('dialog[data-portfolio-dialog]');

    await expect(dialog.locator('[data-modal-title]'), `title #${index + 1}`).toHaveText(
      expected.title,
    );
    await expect(
      dialog.locator('[data-modal-description]'),
      `description #${index + 1}`,
    ).toHaveText(expected.description);
    await expect(dialog.locator('[data-modal-tools]'), `tools #${index + 1}`).toHaveText(
      expected.tools,
    );

    const images = await dialog
      .locator('[data-modal-image]')
      .evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).src).pathname));
    expect(images, `images #${index + 1}`).toEqual(expected.images);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', '');
  }
});

test('every image referenced anywhere resolves', async ({ page, request }) => {
  await page.goto('/');
  const paths = new Set<string>();

  const tiles = page.locator('[data-portfolio-tile]');
  for (let index = 0; index < 15; index++) {
    await tiles.nth(index).click();
    const dialog = page.locator('dialog[data-portfolio-dialog]');
    const srcs = await dialog
      .locator('[data-modal-image]')
      .evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).src).pathname));
    srcs.forEach((src) => paths.add(src));
    await page.keyboard.press('Escape');
  }

  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test('the only third-party request is the Gravatar avatar', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) external.push(`${protocol}//${hostname}`);
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const unexpected = external.filter((origin) => origin !== 'https://en.gravatar.com');
  expect(unexpected).toEqual([]);
});
```

- [ ] **Step 2: Run the full suite**

Run: `npm test && npm run test:content`
Expected: every spec passes. If a `tools` assertion fails, the YAML list order in that entry is wrong; if an `images` assertion fails, compare against the Task 4 table.

- [ ] **Step 3: Commit**

```bash
git add tests/parity.spec.ts
git commit -m "test: assert full content parity with the frozen legacy page"
```

---

## Task 12: Deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm ci`, `npm test`, `npm run build` from Task 1.
- Produces: a Pages deployment from `dist/` on every push to `main`.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - run: npx playwright install --with-deps chromium

      - run: npm run test:content

      - run: npm test

      - run: npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the workflow is valid YAML and the referenced scripts exist**

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('valid yaml')"
node -e "const s=require('./package.json').scripts; ['test','test:content','build'].forEach(k=>{ if(!s[k]) throw new Error('missing script: '+k); }); console.log('scripts present')"
```

Expected: `valid yaml` and `scripts present`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: build, test, and deploy to GitHub Pages via Actions"
```

- [ ] **Step 4: Switch the Pages source — required, or the site will not change**

The workflow will run green while GitHub keeps serving the old branch content until this is done.

```bash
gh api -X POST repos/taak77/taak77.github.io/pages \
  -f build_type=workflow 2>/dev/null \
  || gh api -X PUT repos/taak77/taak77.github.io/pages -f build_type=workflow
gh api repos/taak77/taak77.github.io/pages --jq '.build_type'
```

Expected: `workflow`. If `gh` is not authenticated, set it in the repository UI under Settings → Pages → Build and deployment → Source → GitHub Actions.

- [ ] **Step 5: Final verification before merge**

```bash
npm run test:content && npm test && npm run build
du -sh dist
grep -c 'http://' dist/index.html || echo "0 insecure references — correct"
```

Expected: all tests pass; `grep` finds no `http://` references. That absence is the original bug, fixed.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: stack and versions → Task 1; removed dependencies and asset relocation → Task 3; content model and the 15-item inventory → Task 4; Tailwind tokens, breakpoints, fonts, and star divider → Task 5; static page content, head metadata, and hero → Task 6; portfolio grid → Task 7; modal island → Task 8; navbar island → Task 9; About, footer, scroll-to-top → Task 10; verification and the parity test → Tasks 2 and 11; deployment and the Pages source flip → Task 12. The `legacy-baseline` tag and comparison harness the spec calls for are Task 1 Step 1 and Task 2. Non-goals are enforced by omission and by the Global Constraints list.

**Placeholder scan.** No `TBD`, `TODO`, "similar to Task N", or "add error handling" instructions. Every code step contains complete, runnable content. The one table-driven step (Task 4 Step 4) provides two full worked examples plus every field value for the remaining 13 entries.

**Type consistency.** `PortfolioModalItem` is defined in Task 8 and its exact field names (`title`, `images`, `imageColumns`, `tools`, `description`) are used unchanged in the `index.astro` mapping in Tasks 8 and 10. The collection schema field names in Task 4 (`title`, `order`, `thumbnail`, `images`, `imageColumns`, `tools`) match every consumer. Test selectors are stable across tasks: `[data-portfolio-tile]`, `[data-portfolio-index]`, `[data-portfolio-dialog]`, `[data-modal-title]`, `[data-modal-image]`, `[data-modal-description]`, `[data-modal-tools]`, `[data-nav-sentinel]`, `[data-navbar]`, `[data-nav-toggle]`, `[data-nav-menu]`, `[data-scroll-top]`.

**Pre-flight corrections.** Four defects were found and fixed before execution began: (1) `node --test` cannot run a `.ts` file on Node 22.17.0 — verified empirically — so the content check is `tests/content-files.check.mjs`; (2) Playwright's default `testMatch` would have tried to run that node:test file, so `testMatch` is now explicitly `**/*.spec.ts`; (3) `z-1050`/`z-1049` are not reliably valid Tailwind utilities and are now `z-[1050]`/`z-[1049]`; (4) the star SVG path was duplicated verbatim between `Star.astro` and `PortfolioModal.tsx` and is now the shared `STAR_PATH` constant.

**Known follow-up.** Task 6's hero uses `max-w-[33%]` to approximate the original's `col-sm-4` intro paragraph width. This is the layout detail most likely to need adjustment during the owner's visual comparison, along with the About section's offset columns in Task 10.
