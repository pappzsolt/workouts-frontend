---
name: workouts-mobile-responsive
description: Mobile-first layout review and safe, presentation-only fixes for the Angular Workouts frontend. Preserve all business functionality and desktop behavior.
---

# Workouts mobile-responsive skill

Based on the mobile-responsive agent skill by AsadSumbul (MIT):
https://github.com/AsadSumbul/mobile-responsive

## Read before editing

1. Read `design-system/workouts/MASTER.md`, `tailwind.config.js` and neighboring Angular templates.
2. Reuse the project's Tailwind 3 breakpoints, colors, `workouts-*` classes and Angular Material elements. Do not add a new UI framework.
3. Inspect athlete, coach and administrator pages rather than only the landing page.

## Non-negotiable scope

- Presentation changes only: HTML layout classes and CSS rules. Preserve `routerLink`, Angular bindings, button click handlers, form model/directives, event outputs, roles, access controls, feature visibility and API contracts exactly.
- Do not change TypeScript, routes, services, requests, validation logic, page state, training rules or the way athlete/coach data is shared.
- Do not hide or disable controls on mobile; reflow them so every action stays available.
- Do not mask a whole-page overflow with `overflow-x: hidden`. For wide tables, preserve every column and enable scrolling *inside* a clearly bounded table container.
- If a mobile UX improvement requires a behavior or data change, DO NOT implement it. Add it to the separate "Approval required" list with the affected screen, reason and exact intended behavior.

## Review and fix

- Start at 320px, then 375, 414, 768, 1024, 1280 and 1440px. Test both portrait and landscape.
- Fix overflowing flex items using `min-w-0`, flexible width and word wrapping. Reflow toolbars and dense filters rather than shrinking text below a readable size.
- Keep touch actions approximately 44px tall, visible keyboard focus and readable forms (16px inputs on phones to prevent unwanted iOS zoom).
- Prefer existing `sm:`/`md:`/`lg:` utilities; preserve desktop classes whenever possible.
- Keep breadcrumbs, modals, program calendars and scrollable set/target tables usable without clipping controls.

## Verification and output

- Check diff touches only templates/CSS plus docs/tests/skill; inspect all Angular event bindings before and after.
- Run `node --test tests/mobile-presentation.test.cjs` and (when dependencies and a running frontend are available) the existing Playwright UI-contract suite.
- Use DevTools/Playwright at every viewport, checking `document.documentElement.scrollWidth <= innerWidth + 1`, button accessibility and no clipped dialogs.
- Deliver a clean `git apply` patch, a list of changed screens, and a separate list of suggestions needing functional approval. Never claim a live-browser pass without actually running one.
