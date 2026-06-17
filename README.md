# MySteam

A sleek, mobile-first personal game backlog tracker with a Steam-inspired interface.

## Features

- **Steam Store Search** — Search games via the unofficial Steam Store API
- **Game Details** — View trailers, screenshots, descriptions, and metadata
- **Backlog Tracking** — Organize games into Wishlist, Playing, Completed, and Dropped
- **Cloud Persistence** — Backlog syncs to disk and survives redeployments
- **Responsive Design** — Mobile-first with bottom navigation, desktop sidebar

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Filesystem persistence (JSON per sync ID on a mounted volume)
- Steam Store API (proxied server-side)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Locally, backlog data is stored under `./data`. Set `DATA_DIR` to override.

## Deploy on Railway

1. Create a new project from this repo at [railway.app](https://railway.app)
2. Add a **Volume** mounted at `/data`
3. Deploy — Railway auto-detects Next.js (`npm run build` / `npm start`)
4. Optionally set `DATA_DIR=/data` (this is the default in production)

### How persistence works

- All devices share one **library ID** from the server (default: `mysteam-library`)
- Each backlog change syncs to disk via `/api/backlog` at `/data/backlog/{syncId}.json`
- On load, local and remote data merge (latest `updatedAt` wins per game)
- Changes flush on tab close / background for reliability
- Older per-device backlog files are merged into the shared library automatically
