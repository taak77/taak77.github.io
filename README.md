# taak77.github.io

Static GitHub Pages portfolio rebuilt with Astro 7, Preact, and Tailwind CSS 4.

## Requirements

Use the Node.js version in `.nvmrc` (Node.js 22.12.0 or newer), then run `npm install`.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build the static site
- `npm run preview` — preview the production build
- `npm test` — run the Playwright suite
- `npm run test:content` — validate portfolio content and assets
- `npm run compare` — compare the rewrite with the legacy site

Portfolio entries live in `src/content/portfolio/`. The interactive Preact islands are `Navbar` and `PortfolioModal`; the rest of the site is statically rendered by Astro.
