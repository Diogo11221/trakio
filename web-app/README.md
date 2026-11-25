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
| `/definicoes`   | Definições — fees and team (not drawn in Figma yet)                    |

Everything that moves money, suspends an account or removes public content goes through a confirmation dialog (no toggles).

## Stack

- **React 19 + TypeScript (strict)**, CSS Modules, light admin tokens in `src/styles/tokens.css` (mirror of the Figma "Trakio Tokens").
- **React Router 7** for the pages, shared state in `src/data/store.tsx` (sidebar badges update as items are resolved).
- Mock data in `src/data/mock.ts` until `backend-core` exposes the admin API.
- Self-hosted fonts via `@fontsource` (Space Grotesk, Inter, JetBrains Mono).

## Structure

```
src/
  components/   Layout (sidebar), Icon, Portrait, ui (tabs, pills, buttons, dialog, menu, toast)
  pages/        One file per screen + its CSS module
  data/         Mock data and the admin store
  assets/figma/ Images and icons exported from Figma
```
