# Workouts mobile layout review (2026-11-22)

Scope: layout/visibility only, based on the `mobile-responsive` skill and the existing Workouts design system. No TypeScript, routing, service or business-rule edits.

## Changed presentation

- App header: at phone widths the date takes its own row; menu, locale and logout controls wrap within the viewport instead of competing for one narrow line.
- Breadcrumbs: smaller phone gutters and wrapping labels maintain clickable navigation without requiring page-wide sideways scrolling.
- Coach calendar: a 3-column phone toolbar keeps month controls aligned while Today gets a full row; seven-day labels shrink/truncate and date cells use compact phone heights.
- Coach dashboard: long titles, links and client counts wrap rather than forcing a row wider than the device.
- Coach program filters: filter buttons share the available phone width and wrap long translated text.
- Personal program calendar: weekday labels remain within their seven-day grid; empty cells cannot establish an oversized min-content width.
- Completed program history: date/summary pairs stack on phones rather than being squeezed into two unreadable columns.
- Athlete targets, completed sets, coach client sets and admin audit/search tables: scrolling stays inside the table containers, with keyboard focus available.
- Form controls inside application/authentication/dialog shells: phone-sized text to avoid unintentional iOS Safari zoom; media remains bounded by the content width.

## Approval required for behavior changes

None implemented or required by these layout-only fixes. If a later hands-on mobile test finds that an alternative list view, changed table columns, or a simplified calendar interaction would be preferable, those would need separate review because they change how information or actions are presented.

## Verification status

The `tests/mobile-presentation.test.cjs` source regression checks can run without Angular dependencies. A full Angular production build, live role-based UX screenshots and the Playwright suite require local `node_modules`, browser runtimes and a reachable test frontend; they are NOT certified by this patch alone.

Suggested viewport matrix: 320, 375, 414, 768, 1024, 1280 and 1440px. Check athlete/coach/admin navigation, tables, toolbars, calendars, modals, long names, both Hungarian and German locale strings, and portrait/landscape rotations.
