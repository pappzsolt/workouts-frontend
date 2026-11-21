# Workouts — UI/UX Pro Max design-system baseline

Source skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

This is a project-specific interpretation of its publicly documented design principles, **not** generated output from the upstream search script. Run `bash scripts/install-ui-ux-pro-max.sh` on an internet-connected development machine to install the original full skill.

## Product context
Existing Angular 21 / Angular Material 21 / Tailwind 3 application for sportspersons, coaches and administrators. Preserve every current feature, event handler, routerLink, form control, permission and API contract. Styling-only pass.

## Design system
- **Direction:** professional, calm, data-dense fitness SaaS. Not a marketing landing page.
- **Color:** retain semantic tokens from `tailwind.config.js` (`primary`, `surface`, `content`, `info`, `warning`, `delete`). Never communicate status by color alone.
- **Typography:** retain local Inter. 16px baseline, accessible line-height and readable contrast.
- **Components:** consistent 12–20px radii, restrained shadows, coherent 8px spacing rhythm; never change control semantics for decoration.
- **Accessibility:** visible keyboard focus, 44x44 touch targets where practical, meaningful labels, native keyboard behavior.
- **Motion:** small transform/shadow transitions for actionable cards, respect prefers-reduced-motion.
- **Responsive:** test at 375 / 768 / 1024 / 1440px; do not introduce horizontal scrolling or truncate essential text.
- **Anti-patterns:** avoid emoji replacing existing icon components, neons, aggressive animation, invisible focus, placeholder-only forms and removing content/actions to simplify UI.

## Functional non-regression contract
Only markup classes and CSS may change in the UI design pass. No changes to component TypeScript, event bindings, form model, router configs, services or backend. Verify build, theme checks and existing regressions before production deployment.
