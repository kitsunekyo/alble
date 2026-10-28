# Alble

A personal tracker app for Alex and Lily to review their training progress with their dog Pina — a young rescue dog. (Alble = Allein-Bleib-Training)

## Stack

- Next.js 16 (app router), TypeScript, pnpm, Tailwind CSS v4
- Deployed on Vercel

## Commands

```bash
pnpm typecheck          # TypeScript check
pnpm exec vercel --prod  # Deploy to production
```

## Workflow

When asked for a change:
1. Implement the change
2. Run `pnpm typecheck` to verify
3. `git add`, `git commit`, `git push`
4. Deploy only when explicitly told to deploy

## Dev server rules (read before starting one)

- **Exactly one dev server at a time.** Two `next dev` processes (any ports)
  share `.next` and corrupt the Turbopack cache: the first API request then
  takes ~2 minutes and the whole UI looks frozen.
- **Never `rm -rf .next` while a server is running.** The live server keeps
  writing to the deleted cache and every request afterwards hangs.
- If it is already wedged (`/api/*` or page loads spin forever, no log lines):
  kill every `next dev` / `next-server` / postcss child, `rm -rf .next`, start
  one server, and let the **first** API request take up to ~2 min (cold compile
  of the API + serwist bundles) before declaring it broken.
- For agent verification use a dedicated port **only** when no server of the
  user is running, and check `pgrep -af "next dev"` and
  `ss -tlnp | grep :3000` first.
- Plain `pnpm dev` reads `.env` and talks to the **production** Turso DB (and
  auto-applies pending migrations). For local work:
  `TURSO_DATABASE_URL=file:./data/dev.db pnpm dev`.
