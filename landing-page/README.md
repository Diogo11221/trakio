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
- **CSS 3D** for the phone mockups (no WebGL): one phone travels from the hero into the scroll story.
- Self-hosted fonts via `@fontsource` (Space Grotesk, Inter, JetBrains Mono).

## Structure

```
src/
  components/   Nav, buttons, Phone (titanium frame), FitScale, Grain texture
  screens/      App screens shown inside the phones (Treinar, Registo de refeição, Progresso, PT)
  sections/     Showcase (hero + pinned 3-stage story, one phone), ForTrainers, Pricing, Faq, FinalCta, Footer
  hooks/        Smooth scroll, scroll progress bus, reveal-on-view, media queries
  assets/figma/ Images and icons exported from Figma
```

## Motion

- **Hero → story (desktop)** — a single phone starts cropped under the hero copy, tilted back 24°. Scrolling
  carries that same phone to the right-hand 3D rig; then copy and screen cross-fade between
  Treinar → Nutrição → Evolução and each highlight pops out of the screen (`translateZ`) while the screen dims.
  Text and rig scale with the viewport height so nothing overlaps or gets clipped on short screens.
- **Mobile** — hero with the phone in normal flow below the copy, then the three stages stacked.
- **Para PTs** — dashboard window and PT phone settle from a steep 3D angle as the section enters.
- Reveal-on-view for section copy; everything respects `prefers-reduced-motion`.

App screens are authored at 390 pt (iPhone) and scaled to the phone mockup (0.846), like in Figma.
