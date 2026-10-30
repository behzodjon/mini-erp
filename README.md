# Beverage shop mini-ERP

Stock, sales, purchases and cash for a small beverage shop. TypeScript monorepo: Fastify + MongoDB API, React web app, shared Zod schemas.

```
apps/api         Fastify API: domain / application / infrastructure / http, wired in src/composition-root.ts
apps/web         React + Vite UI (Uzbek)
packages/shared  Zod schemas shared by API and web
docs/PROMPTS.md  Every prompt given to the AI, in order
```

## Run locally

Requires Node 22+, pnpm and Docker.

```sh
pnpm install
cp .env.example .env          # then set OWNER_PASSWORD_HASH (see below) and SESSION_SECRET
pnpm hash-password <password> # prints a bcrypt hash for OWNER_PASSWORD_HASH
pnpm db:up                    # MongoDB as a single-node replica set (needed for transactions)
pnpm seed                     # fills an empty database with the demo shop (refuses a non-empty one; add -- --force to override)
pnpm dev                      # API on :3000, web on http://localhost:5173
```

## Test

```sh
pnpm typecheck
pnpm test   # API tests run in-process against an in-memory MongoDB replica set; Docker is not needed
```

## Deploy (Render + MongoDB Atlas)

One Render web service runs the API and serves the built web app, so there is one URL and no CORS. `render.yaml` is the blueprint.

```sh
pnpm build   # builds the web app into apps/web/dist
pnpm start   # production: serves API + web app from Fastify (set NODE_ENV=production and WEB_ROOT=../web/dist)
```

1. Create a free MongoDB Atlas cluster (it is a replica set already, so transactions work). Allow Render to connect (network access `0.0.0.0/0` is fine for the free tier) and create a database user.
2. In Render: New → Blueprint → pick this repo. Set the secret env vars it asks for: `MONGODB_URI` (the Atlas `mongodb+srv://` string), `OWNER_USERNAME`, `OWNER_PASSWORD_HASH` (from `pnpm hash-password <password>`) and `SESSION_SECRET` (32+ random chars).
3. Open the URL: the login page shows, and `/api/health` reports `{"api":"ok","database":"ok"}`.

Live URL: https://beverage-shop-erp.onrender.com (free instance: the first request after idle takes ~50 s)

## Demo data

`pnpm seed` builds a running shop through the use cases (products, a warehouse tree, purchases, sales, a stock count with a shortage, loans in both directions, expenses, and one draft of each document). It reads the same `.env` as the API, so pointing `MONGODB_URI` at Atlas seeds the live database. The login is whatever `OWNER_USERNAME` and the password behind `OWNER_PASSWORD_HASH` are; share those with the reviewer.
