# HeroUI Playground

An independent home for the UI designs previously at PowerMap's `/playground`.

## Run locally

```sh
npm ci --prefix client
npm run dev
```

Open the local URL printed by Vite. The home page is a menu of styles; each style is its own page, starting with Apple at `/apple`. Any other path shows the menu.

```sh
npm run build
npm run lint
npm run preview
```

No PowerMap checkout or backend is required. Inter loads from Google Fonts, using the same font request and fallback stack as the original page.

The site report card's map reads its Mapbox public token from `VITE_MAPBOX_TOKEN` in `client/.env`. Restart the dev server after changing it. Without a token the map area shows a placeholder and everything else works.

## Design files

- `client/src/App.tsx` lists the styles and picks the page from the URL.
- `client/src/Home.tsx` is the home menu, centred on the page.
- `client/src/Playground.tsx` is the Apple style. It composes the cards: the original two in the first row, the site report card in the second.
- `client/src/UtilizationCharts.tsx` contains the utilization and occupancy charts, sample data, animations, and tooltips.
- `client/src/EvAdoptionCard.tsx` contains the EV adoption card, sample data, and animated growth chart.
- `client/src/SiteReportCard.tsx` contains the site report card (score factors, EV registration breakdown and Mapbox map), with sample data.
- `client/src/index.css` preserves the original theme, typography, component overrides, and focus treatment.

The three original design files were copied without changes; since then `Playground.tsx` has gained the second row, and the first row renders as before. Dependencies and their lockfile preserve the versions used by the original playground, including HeroUI 3.2.2, React 19.2.7, and Recharts 3.10.1. Keep those versions pinned when preserving the designs; compare the rendered page before accepting dependency upgrades.

## Visual reference

The original PowerMap page is preserved in [the reference screenshot](reference/playground.png), with [an occupancy tooltip example](reference/occupancy-hover.png). These were captured at a 1440 × 1000 viewport with Inter fully loaded.

Migration checks compared the original page against the standalone development and production builds across desktop, tablet, mobile, Retina, dark system preference, reduced motion, hover, and keyboard focus states. All 11 states preserved element geometry and passed image comparison (Pixelmatch threshold 0.01, excluding browser antialiasing). A separate comparison of all computed CSS properties on all 453 rendered elements found no differences. Both projects passed TypeScript builds and lint; the standalone project also passed a clean `npm ci` installation.
