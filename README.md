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
pnpm dev                      # API on :3000, web on http://localhost:5173
```

## Test

```sh
pnpm typecheck
pnpm test   # API tests run in-process against an in-memory MongoDB replica set; Docker is not needed
```
