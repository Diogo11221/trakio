# Trakio — Landing page

React + TypeScript (Vite) implementation of the Figma page **03 · Landing** in "Trakio — Design".

## Scripts

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
npm run preview    # serve the production build
```

## Stack

- **React 19 + TypeScript (strict)**, CSS Modules, tokens in `src/styles/tokens.css` (mirror of the Figma "Trakio Tokens").
- **Lenis** for smooth scrolling (disabled with `prefers-reduced-motion`).
- **React Three Fiber / three.js** for the hero backdrop: two machined iron plates with a procedural
  lathe-turned metal texture, lit by three's `RoomEnvironment` (no HDRI download). Lazy-loaded and skipped below 900 px.
- Self-hosted fonts via `@fontsource` (Space Grotesk, Inter, JetBrains Mono).

## Structure

```
src/
  components/   Nav, buttons, Phone (titanium frame), FitScale, Grain texture
  screens/      App screens shown inside the phones (Treinar, Registo de refeição, Progresso, PT)
  sections/     Hero, ScrollStory (pinned, 3 stages), ForTrainers, Pricing, Faq, FinalCta, Footer
  three/        Hero 3D scene
  hooks/        Smooth scroll, scroll progress bus, reveal-on-view, media queries
  assets/figma/ Images and icons exported from Figma
```

## Motion

- **Hero** — the phone stands up (24° → 0°) and rises on scroll; tilts with the pointer.
- **Scroll story** — one pinned phone; copy and screen cross-fade between Treinar → Nutrição → Evolução and
  each highlight pops out of the screen in 3D (`translateZ`) while the screen dims.
- **Para PTs** — dashboard window and PT phone settle from a steep 3D angle as the section enters.
- Reveal-on-view for section copy; everything respects `prefers-reduced-motion`.

App screens are authored at 390 pt (iPhone) and scaled to the phone mockup (0.846), like in Figma.
