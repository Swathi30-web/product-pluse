# ProductPulse — Customer Feedback & Product Roadmap SaaS

React + TypeScript + Vite + Tailwind CSS + React Router + Axios + JSON Server + Recharts.
All data comes from JSON Server (`db.json`) through Axios; nothing is hardcoded in components.

## Run locally
```bash
npm install
npm run dev        # starts JSON Server (http://localhost:3001) and Vite (http://localhost:5173)
```
Reset demo data any time with `npm run seed`.

## Demo accounts (password `demo123`)
| Email | Acme Cloud | Nova Analytics |
|---|---|---|
| alex@acme.com | Owner | Admin |
| priya@acme.com | Admin | Owner |
| sam@acme.com | Product Manager | – |
| jordan@customer.com | Customer | Customer |
| taylor@customer.com | Customer | – |

Public roadmaps: `/public/acme-cloud`, `/public/nova-analytics` (no login).
Nova Analytics is on the Free plan at 80% feedback usage, so it shows a limit warning.

## Role permissions
- **Owner**: everything, including settings, owner role assignment and subscription plan.
- **Admin**: feedback, categories/tags, roadmap, release notes, team members.
- **Product Manager**: review feedback, status/priority, merge duplicates, move roadmap stages, edit roadmap items.
- **Customer**: submit/edit own feedback, vote, comment, view roadmap and published release notes.

## Deploy (Netlify or Vercel)
The frontend is static; JSON Server needs its own host.
1. Deploy the API (e.g. Render/Railway web service): build `npm install`, start `npx json-server db.json --host 0.0.0.0 --port $PORT`.
2. In Netlify/Vercel set env var `VITE_API_URL=https://your-api-host`, build command `npm run build`, output `dist`.
   `netlify.toml`, `public/_redirects` and `vercel.json` already handle SPA routing.

## Structure
`src/lib` (api, types, utils, hooks) · `src/context` (auth, workspace/role/plan limits) · `src/components` · `src/pages` · `scripts/seed.mjs`
