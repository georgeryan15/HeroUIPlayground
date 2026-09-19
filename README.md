# HeroUI Playground

An independent home for the UI designs previously at PowerMap's `/playground`.

## Run locally

```sh
npm ci --prefix client
npm run dev
```

Open the local URL printed by Vite. The playground is the home page; `/playground` also displays the same designs.

```sh
npm run build
npm run lint
npm run preview
```

No PowerMap checkout, backend, API keys, or environment variables are required. Inter loads from Google Fonts, using the same font request and fallback stack as the original page.

## Design files

- `client/src/Playground.tsx` composes the cards and their original layout.
- `client/src/UtilizationCharts.tsx` contains the utilization and occupancy charts, sample data, animations, and tooltips.
- `client/src/EvAdoptionCard.tsx` contains the EV adoption card, sample data, and animated growth chart.
- `client/src/index.css` preserves the original theme, typography, component overrides, and focus treatment.

The three design components were copied without changes. Dependencies and their lockfile preserve the versions used by the original playground, including HeroUI 3.2.2, React 19.2.7, and Recharts 3.10.1. Keep those versions pinned when preserving the designs; compare the rendered page before accepting dependency upgrades.

## Visual reference

The original PowerMap page is preserved in [the reference screenshot](reference/playground.png), with [an occupancy tooltip example](reference/occupancy-hover.png). These were captured at a 1440 × 1000 viewport with Inter fully loaded.

Migration checks compared the original page against the standalone development and production builds across desktop, tablet, mobile, Retina, dark system preference, reduced motion, hover, and keyboard focus states. All 11 states preserved element geometry and passed image comparison (Pixelmatch threshold 0.01, excluding browser antialiasing). A separate comparison of all computed CSS properties on all 453 rendered elements found no differences. Both projects passed TypeScript builds and lint; the standalone project also passed a clean `npm ci` installation.
