# Trakio — Admin (backoffice web)

React + TypeScript (Vite) implementation of the Figma page **06 · Admin** in "Trakio — Design": the internal backoffice for the Trakio team.

## Scripts

```bash
npm install
npm run dev        # local dev server on http://localhost:5174
npm run build      # type-check + production build
npm run preview    # serve the production build
```

## Screens

| Route           | Screen                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `/`             | Visão geral — KPIs, revenue per month, AI meal logging, "Por rever"    |
| `/verificacao`  | Verificação de PTs — queue, documents, approve / ask for info / refuse |
| `/utilizadores` | Utilizadores — filters, search, suspend / reactivate                   |
| `/pagamentos`   | Pagamentos — refunds, disputes, CSV export                             |
| `/denuncias`    | Denúncias — reported reviews and profiles                              |
| `/biblioteca`   | Biblioteca de exercícios — 3D demo status, add exercise                |
| `/definicoes`   | Definições — fees, prices, connected services and admin team (read-only) |

Everything that moves money, suspends an account or removes public content goes through a confirmation dialog (no toggles).

## Stack

- **React 19 + TypeScript (strict)**, CSS Modules, light admin tokens in `src/styles/tokens.css` (mirror of the Figma "Trakio Tokens").
- **React Router 7** for the pages, shared state in `src/data/store.tsx` (sidebar badges update as items are resolved).
- Data from `backend-core`'s admin API (`src/api.ts`, `src/data/store.tsx` → `useApi`). Set `VITE_API_URL`
  (defaults to `http://localhost:8080`; the backend's dev CORS allows `http://localhost:5174`).
- **Sign-in with an admin account only** (the first admin comes from the server configuration; in the dev
  profile, `admin@trakio.test` / `trakio123`). The access token lives in memory, the refresh token in
  `sessionStorage`: closing the tab ends the session. Protected photos and documents are fetched with the
  token; documents open through 5-minute signed links.
- Fees and prices are read-only here (server configuration and Stripe prices); disputes are answered in the
  Stripe dashboard. Every admin decision lands in the server's audit log.
- Self-hosted fonts via `@fontsource` (Space Grotesk, Inter, JetBrains Mono).

## Structure

```
src/
  components/   Layout (sidebar), Icon, Photo, ui (tabs, pills, buttons, dialog, menu, toast)
  pages/        One file per screen + its CSS module
  data/         Mock data and the admin store
  assets/figma/ Images and icons exported from Figma
```
