# MySteam

A sleek, mobile-first personal game backlog tracker with a Steam-inspired interface.

## Features

- **Steam Store Search** — Search games via the unofficial Steam Store API
- **Game Details** — View trailers, screenshots, descriptions, and metadata
- **Backlog Tracking** — Organize games into Wishlist, Playing, Completed, and Dropped
- **Cloud Persistence** — Backlog syncs to Vercel Blob and survives redeployments
- **Responsive Design** — Mobile-first with bottom navigation, desktop sidebar

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Vercel Blob (private JSON per sync ID)
- Steam Store API (proxied server-side)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Blob configured, the app falls back to browser localStorage only.

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add a **Blob** store and connect it to the project (or set env vars manually)
3. Ensure these env vars are set:
   - `BLOB_STORE_ID`
   - `BLOB_READ_WRITE_TOKEN` (or OIDC via connected store on Vercel)
4. Deploy

### How persistence works

- Each browser gets a stable anonymous **sync ID** (localStorage + cookie)
- Every backlog change syncs to Blob via `/api/backlog`
- On load, local and remote data merge (latest `updatedAt` wins per game)
- Changes flush on tab close / background for reliability

Your collection persists across redeployments, browser restarts, and cache clears (as long as the sync cookie remains).
