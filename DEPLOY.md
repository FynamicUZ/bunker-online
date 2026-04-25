# Deploying Bunker Online

## 1. Supabase

1. Create a Supabase project.
2. **SQL Editor → New query →** paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run. This sets up tables, RLS policies, and adds the relevant tables to the `supabase_realtime` publication.
3. **Authentication → Providers → Anonymous Sign-Ins:** enable.
4. Copy the project URL and the anon key into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

If you already ran an older version of the schema, run the numbered files in [`supabase/migrations/`](supabase/migrations/) in order instead — they're idempotent.

## 2. Local development

Next 16 currently OOMs under Turbopack on this project (memory leak in dev). Use webpack:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev -- --webpack
```

## 3. Verify

```bash
npm run typecheck
npm run lint
npm run build
```

## 4. Deploy

Both Vercel and Netlify work — pick one. The app has no server-only secrets, so a single env-var pair (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is all the host needs.

### Option A — Vercel

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars in Project → Settings → Environment Variables.
4. Deploy.

### Option B — Netlify

1. Push to GitHub.
2. Netlify Dashboard → **Add new site → Import from Git** → pick the repo.
3. Build settings (auto-detected, but verify):
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Netlify auto-installs `@netlify/plugin-nextjs` for Next.js projects.
4. **Site settings → Environment variables** → add both `NEXT_PUBLIC_SUPABASE_*` vars.
5. Deploy.

> The build runs Turbopack on the deploy host. If you hit OOM during the Netlify build, raise the memory limit in `netlify.toml`:
> ```toml
> [build.environment]
>   NODE_OPTIONS = "--max-old-space-size=4096"
> ```

## 5. Smoke test

1. Open the deployed URL in two browsers (or one normal + one incognito).
2. Create a room in the first, copy the code, join with the second.
3. Host clicks **O'yinni boshlash** — both windows should land on `/room/{code}/game`.
4. Each player clicks **Maydonimni ochish** to reveal a field.
5. Host clicks **Ovozlash →**, both vote, host clicks **Ovozlarni yakunlash**.
6. After enough rounds, the room flips to `finished` and both windows redirect to `/room/{code}/results`.
7. Host clicks **Yana o'ynash** — both windows return to the lobby with characters cleared.
