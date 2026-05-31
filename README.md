# Volt &amp; Mile — The Complete EV Ownership Guide

A standalone, statically-exported **Next.js + TypeScript** site about owning an
electric vehicle, designed to deploy to **GitHub Pages**. It pairs in-depth
editorial content with interactive tools, including **Babylon.js** 3D graphics
and free, key-less maps.

🔗 Once Pages is enabled, the site publishes to
`https://<your-username>.github.io/ev/`.

## What's inside

**Interactive tools**
- **ZIP-code charging-station finder** (top of page) — geocodes your ZIP and
  pulls nearby chargers onto a live map.
- **Trip planner** — routes any start→destination on free maps, finds chargers
  along the route, and estimates stops, energy, and cost for short & long trips.
- **Calculators** — EV-vs-gas savings, single-charge & whole-trip cost, and
  rooftop-solar payback.
- **Babylon.js 3D showroom** — an orbit-able electric car you can spin, charge
  (animated particle stream + battery readout), repaint, and toggle the lights.
- **Babylon.js battery-science scene** — watch lithium ions migrate between
  electrodes; toggle charging vs. driving.
- **Floating quick-nav menu** with live section highlighting and search.

**Editorial content**
- 10 things to know about battery & charging · the science · performance tips
- How to drive an EV · professional driving techniques · in-depth tutorials
- EV vs hybrid vs gas · head-to-head EV comparison · foreign vs US EVs
- New models (trucks, SUVs, semis) · what to avoid · what can go wrong
- Nightmare scenarios · best deals · garage (CA) vs other charging · solar setups
- Teens + autopilot · latest features & the Waymo-led robotaxi rollout · FAQ
- **Most-popular-this-week** articles (paginated) and **fresh articles** at the bottom.

## Tech

- Next.js 14 (App Router) with `output: 'export'` → fully static
- TypeScript, plain CSS design system (no runtime CSS framework)
- Babylon.js (`@babylonjs/core`) for 3D, lazy-loaded client-side
- Leaflet + react-leaflet for maps, lazy-loaded client-side
- Charger data: **Open Charge Map** (pricing, power, operator & operational
  status) with automatic fallback to OpenStreetMap **Overpass**; geocoding via
  **Nominatim**; routing via **OSRM** — all free
- Per-article detail pages are statically generated (`/articles/[id]`)

## Optional configuration

Open Charge Map works without a key (rate-limited). For higher limits, grab a
free key at [openchargemap.org](https://openchargemap.org) and set it before
building:

```bash
NEXT_PUBLIC_OCM_KEY=your_key npm run build
```

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # static export to ./out
```

## Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys on push.
In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The workflow injects the correct base path (`/ev`) automatically.

> Educational content only — not financial or professional advice. Range,
> price, and incentive figures are approximate and change often. Map/charger
> data comes from OpenStreetMap contributors, OSRM, and Overpass.
