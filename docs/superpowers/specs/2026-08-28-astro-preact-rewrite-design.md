# Rewrite taak77.github.io on Astro + Preact + Tailwind 4

**Date:** 2026-08-28
**Status:** Approved design, pending implementation plan

## Goal

Replace the 2014 Start Bootstrap "Freelancer" implementation with a current static
stack, preserving the existing look, content, and behavior. The site remains a
static GitHub Pages deployment.

Two motivations drive the stack choice, both stated by the owner:

1. **Showcase.** The page carries `noindex,nofollow`, so anyone evaluating the
   owner reads the *repository*, not the rendered page. The code is the pitch.
2. **Debt removal.** Bootstrap 3.2, jQuery 1.11, and Font Awesome 4.1 are a
   decade past support.

## Workflow

All rewrite work happens on `feat/astro-rewrite`, which is pushed to `origin`.
`main` stays untouched until the work is reviewed and merged, so the live site
keeps serving the current `index.html` throughout.

The branch must be pushed as it progresses, not held locally. Work was once lost
to a local-only branch when the session moved between machines; the branch is now
the durable record.

`.gitignore` includes `.worktrees/` (the branch may be checked out as a worktree
on some machines) and `.superpowers/` (agent scratch space).

## Non-goals

Explicitly out of scope, by owner decision:

- Making the site indexable. `<meta name="robots" content="noindex,nofollow">`
  and `robots.txt` are retained deliberately.
- Replacing the external Gravatar hero image with the local `img/profile.png`.
- Adding a PDF resume. The `.docx` download stays as-is.
- Pruning unused images (`img/logo/*`, dead `.png`/`.jpg` duplicates of `.webp`).
- Filling the empty `meta description` / `meta author`, or adding Open Graph tags.
- Astro `<Image>` optimization. Images are copied through byte-for-byte.
- Any visual redesign.

## Baseline: what the live site actually does

Verified against `https://taak77.github.io/` on 2026-08-28. The served HTML is
byte-identical to the repository's `index.html`.

Three subresources are requested over `http://` from an HTTPS page and are
**blocked as mixed content** in every modern browser:

```
Mixed Content: ... requested an insecure stylesheet
  'http://fonts.googleapis.com/css?family=Montserrat:400,700'
Mixed Content: ... requested an insecure stylesheet
  'http://fonts.googleapis.com/css?family=Lato:400,700,400italic,700italic'
Mixed Content: ... requested an insecure script
  'http://cdnjs.cloudflare.com/ajax/libs/jquery-easing/1.3/jquery.easing.min.js'
```

Consequences, confirmed at runtime:

- The only loaded webfonts are `Glyphicons Halflings` and `FontAwesome`.
  Montserrat and Lato never load; type falls back to Helvetica Neue.
- `jQuery.easing.easeInOutExpo` is `undefined`, so the intended 1500ms
  exponential anchor scroll silently runs on jQuery's default `swing` curve.

**Decision:** the rewrite targets the *designed* typography, not the accidental
fallback. Montserrat and Lato are self-hosted and will load. This is the one
intentional visual deviation from the current live site.

Dead code confirmed present and unreferenced: `js/contact_me.js`,
`js/jqBootstrapValidation.js`, and `mail/contact_me.php` support a contact form
that was removed from the HTML. PHP cannot execute on GitHub Pages regardless.

## Stack

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Astro, `output: 'static'` | 7.2.9 |
| Islands | Preact via `@astrojs/preact` | 6.0.4 / 10.29.8 |
| Styling | Tailwind 4 via `@tailwindcss/vite` | 4.3.3 |
| Fonts | `@fontsource/montserrat`, `@fontsource/lato` | 5.3.0 |
| Tests | `@playwright/test` | 1.62.1 |
| Language | TypeScript, `strict` | — |
| Runtime | Node 22 (Astro 7 requires `>=22.12.0`) | `.nvmrc`: `22` |

`@astrojs/tailwind` is **not** used; it exists only for legacy Tailwind 3.
Tailwind 4 integrates as a Vite plugin via `npx astro add tailwind`.

A `.nvmrc` pins Node to major version `22`, satisfying Astro's floor without
tying the repo to a patch version that varies between machines and CI.

Two environment notes. On macOS with nvm, a stale `/usr/local/bin/node` v8.11.3
shim can shadow nvm on `PATH`, and Astro 7 refuses to run under it. And `npm ci`
warns `EBADENGINE` because the transitive dependency `undici@8.10.0` wants
`>=22.19.0`; it is a warning only, and the build succeeds.

### Why Tailwind rather than hand-written CSS

The deciding factor is the review loop. The owner will compare old against new
visually and send feedback for adjustment; utilities colocated in markup are
faster to iterate on than locating the owning rule in a stylesheet.

Tailwind's default breakpoints (640/768/1024/1280) do not match Bootstrap 3's,
so they are overridden rather than worked around. The inherited design system
becomes explicit tokens:

```css
@theme {
  /* Bootstrap 3 breakpoints — required for layout fidelity */
  --breakpoint-sm: 768px;
  --breakpoint-md: 992px;
  --breakpoint-lg: 1200px;

  /* Bootswatch Flatly, from less/variables.less + css/bootstrap.css */
  --color-brand-primary: #2c3e50;
  --color-brand-success: #18bc9c;
  --color-navbar-active: #1a242f;
  --color-btn-default: #95a5a6;

  --font-heading: Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-body: Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
```

A small amount stays hand-written CSS in `global.css` (~40 lines) because
utilities are the wrong tool for it:

- The `hr.star-light` / `hr.star-primary` divider — a positioned `::after` glyph
  overlapping a 5px border.
- The navbar `padding` / `font-size` shrink transition.
- The `.container` widths (750 / 970 / 1170px with 15px gutters) as one
  `@utility container`.

### Removed dependencies

Font Awesome 4.1 is deleted entirely — the whole `font-awesome-4.1.0/` tree
(CSS, LESS, SCSS, and four webfont binaries). The page uses six icons
(`search-plus`, `download`, `chevron-up`, `times`, `linkedin`, `github`) plus
`star` as the CSS `content` glyph in the dividers. These become inline SVGs.
Glyphicons are dropped; the page never visibly uses them.

Deleted: `js/jquery-1.11.0.js`, `js/bootstrap*.js`, `js/classie.js`,
`js/cbpAnimatedHeader*.js`, `js/jqBootstrapValidation.js`, `js/contact_me.js`,
`js/freelancer.js`, `css/bootstrap*.css`, `css/freelancer.css`, `less/`,
`fonts/`, `mail/`, `.idea/`, `taak77.github.io.iml`, and all `.DS_Store` files.
A real `.gitignore` replaces the empty one.

For scale, measured on disk: the current page loads 167KB of uncompressed
JavaScript (jQuery 1.11 unminified is 96KB of that) — 38KB of which is dead —
plus 138KB of CSS. A further 1.0MB of icon and glyph webfont binaries sits in
`font-awesome-4.1.0/` (864KB) and `fonts/` (152KB) to serve six icons.

After: Preact is ~4KB gzipped, the islands are a few KB, Tailwind emits only the
utilities actually used, and the icons are inline SVG.

## Repository layout

```
.nvmrc  astro.config.mjs  tsconfig.json  package.json
.github/workflows/deploy.yml
src/
  content.config.ts            # Zod schema for the portfolio collection
  content/portfolio/*.md       # 15 entries, one file per project
  layouts/BaseLayout.astro
  components/
    Navbar.tsx                 # Preact island
    PortfolioModal.tsx         # Preact island
    PortfolioGrid.astro
    Hero.astro  About.astro  Footer.astro
    StarDivider.astro
    icons/*.astro
  pages/index.astro
  styles/global.css            # @import "tailwindcss" + @theme + custom rules
public/
  img/**                       # copied verbatim, paths unchanged
  docs/Takashi Aoki.docx
  robots.txt
tests/
  content-parity.spec.ts
  fixtures/legacy-index.html   # the current index.html, frozen
```

`public/img/**` preserves every existing path, so `/img/portfolio/espn-web.webp`
resolves exactly as it does today.

Note: `docs/` at the repository root holds specs (this file) and is *not*
published — only `public/` is copied into the build. The resume moves to
`public/docs/Takashi Aoki.docx`, keeping its current public URL.

## Content model

The 15 modals currently occupy ~470 lines of near-identical copy-pasted HTML in
`index.html`. They collapse into 15 markdown files behind a Zod-validated schema:

```ts
const portfolio = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),          // preserves the hand-curated sequence
    thumbnail: z.string(),            // grid tile image
    images: z.array(z.string()).min(1),
    imageColumns: z.union([z.literal(1), z.literal(2)]).default(1),
    tools: z.array(z.string()).min(1),
  }),
});
```

The one-line description is the markdown body.

Three schema details exist because the current HTML genuinely varies per item,
and the schema models that rather than flattening it:

- **`thumbnail` is separate from `images`.** Several items deliberately show a
  different image in the modal than on the tile: Gamecenter's tile is
  `gamecenter.jpg` but its modal shows `drivechart.gif`; AppleTV uses
  `appletv.jpg` then `appletv-l.jpg`; PS4 uses `ps4.jpg` then `ps4.png`.
- **`imageColumns`** captures that multi-image modals use two different nested
  layouts — `col-sm-6` (two-up) for Stats Lab, Data Viz, and Shopify;
  `col-sm-12` (one-up) for Android App and Ticket Search.
- **`tools` is an array**, joined with `", "` at render time to reproduce the
  current single `<strong>` string exactly.

Adding a 16th project becomes one file rather than two edits in a 798-line
document, and a missing image path or malformed `tools` entry fails the build
instead of shipping.

The current modal anchor IDs (`#portfolioModal1`, `#portfolioModal-axs`) are not
reachable URLs — the modals open only via JavaScript and nothing reads the hash —
so replacing them with clean slugs breaks no links.

### Content inventory (source of truth for the port)

Order matches the current grid, top-left to bottom-right.

| # | Title | Thumbnail | Modal images | Cols | Tools |
| --- | --- | --- | --- | --- | --- |
| 1 | MyAds | `myads.jpg` | `myads.jpg` | 1 | jQuery, Adobe Flex |
| 2 | Hyper Targeting Confusion Matrix | `htcm.jpg` | `htcm.jpg` | 1 | Adobe Flex |
| 3 | NFL Schedules page | `schedules.jpg` | `schedules.jpg` | 1 | YUI3 Graphics, SASS, Compass |
| 4 | NFL Gamecenter | `gamecenter.jpg` | `drivechart.gif` | 1 | YUI3 Graphics, SASS, Compass |
| 5 | Stats Lab | `statslab.jpg` | `statslab-2.jpg`, `statslab-3.jpg`, `statslab-4.jpg`, `statslab-5.jpg` | 2 | YUI3, SASS, Compass, THREE.js |
| 6 | PlayStation 4 | `ps4.jpg` | `ps4.png` | 1 | React, WebMAF SDK, GraphQL |
| 7 | AppleTV | `appletv.jpg` | `appletv-l.jpg` | 1 | Java, Gradle, Gulp, Webpack, Babel, GraphQL |
| 8 | Superbowl Live | `sblive.jpg` | `sblive.jpg` | 1 | React, MobX, Adobe Primetime |
| 9 | Fantasy Live Console | `fflive-console.jpg` | `fflive-console.jpg` | 1 | NodeJS, NPM, Gulp, Backbone, Bootstrap, Mocha |
| 10 | Data Viz Prototypes | `d3.jpg` | `depthchart.jpg`, `drivechart.jpg`, `team.jpg` | 2 | D3.js |
| 11 | ESPN+ | `espn-web.jpg` | `espn-web.webp` | 1 | React SSR, NodeJS, Mencached, GraphQL, VideoJS |
| 12 | Watch ESPN | `espn-web-player.jpg` | `espn-web-player.webp` | 1 | VideoJS, Brightcove |
| 13 | Shopify | `kanopi-landing.jpg` | `kanopi-landing.webp`, `kanopi-pd.webp` | 2 | Shopify, ThemeKit, Liquid, Github Action |
| 14 | Android App | `chordx-android-app-2.jpg` | `chordx-android-app-1.webp`, `chordx-android-app-2.webp`, `chordx-console.webp` | 1 | React Native, Apollo GraphQL, Azure IoT Hub |
| 15 | Ticket Search | `axs-seat-map-crypto.jpg` | `axs-seat-map-crypto.webp`, `axs-seat-map-lagalaxy.webp`, `axs-seat-map-3d.webp` | 1 | React, NodeJS, Express, AWS CodeBuild, DynamoDB, SSM, Spinnaker |

Descriptions, verbatim:

1. Self serve ad platform
2. Internal tools for marketing team to analyze MySpace user targeting
3. Redesigned NFL schedules page with SVG graphics voting tool
4. NFL gamecenter page with live drivechart
5. Google sponsored NFL stats lab
6. NFL PS4 App
7. NFL AppleTV App
8. Live event page for Superbowl
9. Internal console application built with NodeJS
10. Interactive data visualization prototypes using D3.js
11. ESPN+ integrated with ESPN Watch
12. ESPN Web Video Player
13. Ceiling Tiles Shopping Site
14. Marine Diesel Engine Monitoring App
15. New AXS Ticket Search Page

**Known content typo, preserved verbatim:** item 11 reads `Mencached`
(presumably `Memcached`). Ported as-is because content correction is out of
scope; trivially fixable on request.

### Static page content

- **Head** — title `Portfolio - Takashi Aoki`; `robots noindex,nofollow`;
  favicon `img/notion.svg`; `meta description` and `meta author` remain empty.
  The IE8 `html5shiv`/`respond.js` conditional comments and `X-UA-Compatible`
  are dropped.
- **Navbar** — brand `Takashi Aoki` → `#page-top`; links `Portfolio`
  (`#portfolio`) and `About` (`#about`).
- **Hero** — Gravatar image
  `https://en.gravatar.com/userimage/34773047/5aaac04f99bf0a9a39cd748c6a4023ec.jpg?size=256`,
  name `Takashi Aoki`, light star divider, `Software Engineer`, then: *"An
  accomplished detail-oriented application developer with 20+ years of
  professional experience in software engineering."* The current markup centers
  this paragraph using empty `col-sm-4` spacer spans; the rewrite uses a centered
  max-width block, which is visually equivalent.
- **About** — heading `About`, light star divider, *"Professional
  Web/Application Developer with experiences of developing high performance
  Websites / Rich Internet Application."*, and a `Download Resume` button with a
  download icon linking to `docs/Takashi%20Aoki.docx`. Reproduce the current
  asymmetric layout: paragraph in a narrow left-aligned column
  (`col-lg-4 col-lg-offset-4`), button centered in `col-lg-8 col-lg-offset-2`.
- **Footer** — heading `Around the Web`, circular outline buttons linking to
  `https://www.linkedin.com/in/taak77` and `https://github.com/taak77`. The
  `.footer-below` rule in the LESS is unused and is not carried over.
- **Scroll-to-top** — anchor to `#page-top`, shown below 768px only. Fixes the
  `visble-sm` typo in the current class list.

### Visual constants to reproduce

From `css/bootstrap.css` (Flatly) and `less/freelancer.less`:

- Body: Lato 15px, `line-height: 1.42857143`, color `#2c3e50`, background `#fff`.
  `p` is 20px.
- Headings: Montserrat 700, uppercase. `section h2` and modal `h2` are `3em`.
- Navbar: background `#2c3e50`; brand and links `#fff`, hover `#18bc9c`; active
  link background `#1a242f`; toggle border `#1a242f`, icon bars `#fff`;
  uppercase Montserrat 700 with `letter-spacing: 1px` on nav items.
  At ≥768px: `padding: 25px 0` with a `2em` brand, shrinking to `padding: 10px 0`
  with a `1.5em` brand, `transition: 0.3s`.
- Sections: `padding: 100px 0`, reduced to `75px` below 768px. Hero container
  `padding-top` 100px, rising to 200px at ≥768px.
- Hero type: name `2em` → `4.75em` at ≥768px; skills `1.25em` → `1.75em`.
- `section.success`, the hero, and the About block use `#18bc9c` with white text.
  The footer uses `#2c3e50`.
- Portfolio tile: `max-width: 400px`, `margin-bottom` 15px below 767px and 30px
  above. Hover caption is `rgba(24, 188, 156, 0.9)`, `opacity` 0 → 1,
  `transition: all ease 0.5s`, with a centered white `search-plus` icon at `3em`.
- `btn-outline`: white text at 20px, `2px` white border, transparent background,
  `margin-top: 15px`, `transition: all 0.3s ease-in-out`; on hover background
  white with `#18bc9c` text.
- `btn-social`: 50×50, `2px` white border, fully rounded, 20px, `line-height: 45px`.
- Modal: full-bleed white panel, square corners, no shadow, `min-height: 100%`,
  `padding: 100px 0`, centered text; images `margin-bottom: 30px`; the tools list
  `margin: 30px 0`. Close affordance is a 75×75 hit area at `top: 25px;
  right: 25px` drawn as two 1px `#2c3e50` lines rotated 45°/90°, `opacity: 0.3`
  on hover. The footer button is a `btn-default` (`#fff` on `#95a5a6`) reading
  `Close` with a times icon.

## Behavior

### Static, no JavaScript

- **Anchor scrolling** — `scroll-behavior: smooth` plus `scroll-margin-top` to
  clear the fixed navbar. This replaces the original 1500ms `easeInOutExpo`
  intent (and the `swing` curve it actually degraded to). Duration and easing
  become the browser's, so this will feel faster than today. Accepted by the
  owner; it is one line, ships no JavaScript, and honors
  `prefers-reduced-motion` automatically.
- **Portfolio grid** — all 15 tiles render as real HTML in the build output. The
  hover caption is pure CSS.
- **Scroll-to-top** — a plain anchor.

### `PortfolioModal.tsx` (Preact, `client:visible`)

Receives all 15 items as props and holds `selectedIndex` state. Renders a native
`<dialog>`, which supplies Esc-to-close, the backdrop, and focus trapping from
the platform rather than from ~700 lines of Bootstrap modal JS. The static tiles
are `<button>` elements; the island attaches one delegated click listener.

Adds `aria-modal`, returns focus to the triggering tile on close, and locks body
scroll while open. Hydrating on `client:visible` means it costs nothing until the
grid enters the viewport.

### `Navbar.tsx` (Preact, `client:idle`)

Owns three behaviors:

- The `navbar-shrink` state past 300px of scroll — same threshold, driven by an
  `IntersectionObserver` sentinel instead of the original 250ms `setTimeout`
  polling loop.
- The mobile hamburger toggle, auto-closing when a link is clicked.
- The scrollspy active-link highlight, via `IntersectionObserver`.

`client:idle` keeps the mobile toggle responsive early without blocking first
paint.

## Deployment

GitHub Actions builds and deploys the artifact on push to `main`, using
`actions/configure-pages`, `actions/upload-pages-artifact`, and
`actions/deploy-pages`. Build output stays out of git.

This requires a one-time change of the Pages source from **Branch** to
**GitHub Actions** in repository settings. Until that flip happens, the workflow
will run but the site will continue serving the old `index.html` from the branch
root. The `gh` CLI (v2.97.0, installed) can make the change.

## Verification

The owner reviews visual fidelity directly by comparing old against new, so no
automated pixel-diff is built. Two things support that:

1. **Side-by-side harness.** The pre-rewrite commit is git-tagged
   (`legacy-baseline`) and checked out into a git worktree, so the original site
   remains servable with all its assets intact and cannot drift. An
   `npm run compare` script serves that worktree and the new build on two local
   ports at once, so both can be opened at identical viewport widths.

   Separately, `index.html` alone is copied to
   `tests/fixtures/legacy-index.html` as the parsing fixture for the test below.
   The worktree is for eyes; the fixture is for assertions.

2. **Content-parity test** (`tests/content-parity.spec.ts`) — the one automated
   check, covering the failure mode visual review will not catch. It parses the
   frozen `legacy-index.html` and asserts the new build renders:
   - the same 15 titles, in the same order;
   - the same 15 descriptions, verbatim;
   - the same `tools` strings after joining, verbatim (a dropped comma in
     "React, MobX, Adobe Primetime" must fail);
   - the same 15 thumbnail `src` values;
   - the same modal image `src` values per item, in order (a lost fourth Stats
     Lab screenshot must fail).

   Plus a small number of behavioral assertions: the dialog opens on tile click
   and closes on Esc, backdrop, and the Close button; focus returns to the
   triggering tile; and the navbar gains its shrink state past 300px.

## Risks

- **Typography shifts.** Montserrat and Lato will load for the first time, so
  text metrics change versus the live site. Intended, but it is the change most
  likely to look "wrong" at first glance during comparison.
- **Reimplemented grid.** Bootstrap 3's offset-column layouts (the narrow About
  paragraph, the centered modal column) are the likeliest source of subtle
  regressions and deserve the closest look during review.
- **Pages source flip.** Forgetting it means a green CI run and an unchanged
  live site.
- **Node shadowing.** On macOS, the stale `/usr/local/bin/node` v8.11.3 will
  break local builds until `.nvmrc` is respected in the shell.
