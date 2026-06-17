# Cafe Cortero — AGENTS.md

## Project type
Vanilla HTML/CSS/JS e-commerce PWA ("Café Cortero"). No framework, **no build step**. Static site hosted on Vercel, Supabase backend.

## Dev commands
| Command | What it does |
|---|---|
| `npm run dev` | `live-server` on port 3000 (no browser open) |
| `npm run dev:open` | Same, opens browser |

No test/lint/format scripts exist. **No CI pipeline.** No TypeScript on frontend (only Supabase Edge Functions use Deno/TS).

## Architecture quick reference
- **Frontend**: Hand-written HTML in `pages/`, CSS in `css/`, JS in `js/` — organized by feature (auth, admin, shop, finanzas, etc.)
- **Backend**: Supabase (PostgreSQL DB, Auth, Edge Functions, Storage)
- **Push notifications**: Firebase Cloud Messaging via `firebase-messaging-sw.js` + Supabase Edge Function `send-push-notification`
- **API**: `api/wa-proxy.js` — only Vercel serverless function (WhatsApp proxy)
- **Entrypoint**: `index.html` redirects to `pages/home/` or `pages/auth/`

## Database rules (source of truth: Supabase)
- **Do not invent tables or columns.** Schema is defined in `.agent/rules/reglas-generales.md` (section 3). Any change requires Architect approval + a migration.
- Migrations live in `sql/migrations/` (manual SQL) and `supabase/migrations/` (Supabase-managed).

## Existing instruction file
`.agent/rules/reglas-generales.md` — detailed Spanish-language rules covering DB schema, design system (palette, typography, UI components), order states, agent roles (Arquitecto/Developer/QA). Read it for full project conventions.

## Edge function deployment
`.edge-functions/deploy.ps1` (Windows) / `deploy.sh` (Mac/Linux) deploys `send-push-notification` to Supabase. Requires Supabase CLI.

## Key conventions
- Mobile-first, max-width 1200px, breakpoints: 768px / 1024px
- Design palette: green primary `#377b4c`, coffee accent `#8D6E63`, no colors outside palette
- Order states (DB): pending → confirmed → preparing → shipped → delivered | cancelled (translated on frontend only)
- No deleting critical records — use status flags
- Generate `order_number` atomically via `user_order_counters`
