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
4. Deploy with `pnpm exec vercel --prod`
