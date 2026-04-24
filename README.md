# Bunker Online

Multiplayer brauzer o'yini — post-apokaliptik social deduction. O'zbek tilida.

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **shadcn/ui** (Radix + Nova preset)
- **Zustand** (state management)
- **react-hook-form** + **zod** (form va validation)
- **Supabase** (Bosqich 2'dan boshlab — PostgreSQL, Realtime, RPC)

## Lokal ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda oching: [http://localhost:3000](http://localhost:3000)

## Scripts

| Buyruq                 | Vazifa                 |
| ---------------------- | ---------------------- |
| `npm run dev`          | Dev server (Turbopack) |
| `npm run build`        | Production build       |
| `npm run start`        | Production server      |
| `npm run lint`         | ESLint                 |
| `npm run lint:fix`     | ESLint + auto-fix      |
| `npm run format`       | Prettier (yoziladi)    |
| `npm run format:check` | Prettier tekshirish    |
| `npm run typecheck`    | TypeScript type check  |

## Struktura

```
app/                 # Next.js App Router sahifalari
components/
  ui/                # shadcn/ui primitives
  game/              # o'yin komponentlari (kelajakda)
  lobby/             # lobby komponentlari (kelajakda)
lib/
  game/              # o'yin mantiqi va tiplari
  supabase/          # Supabase klient (Bosqich 2)
  validation.ts      # zod schema'lar
data/                # o'yin kontenti (JSON)
supabase/migrations/ # SQL migratsiyalar (Bosqich 2)
```

## Loyiha holati

**Bosqich 1 (Setup)** — ✅ Tugadi. UI skeleton, design tizimi, landing sahifa.
**Bosqich 2 (Xona tizimi)** — keyingi.

To'liq yo'l xaritasi loyiha spetsifikatsiyasida.
