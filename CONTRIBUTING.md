# Contributing

Keep this a small, independent exploration that is easy for the original GeoJogos author to inspect. Prefer a focused, playable change over speculative infrastructure.

Write source and project documentation in English. UI strings belong in the three dictionaries in `src/data/messages.json`; add matching keys and placeholders in every locale. Country facts need a recorded, reliable geography source. Do not put debugging or implementation explanations into player-facing messages.

Use Vue `.vue` single-file components with `<script setup>` for interface elements. Keep movement, solving, generation and validation in framework-independent JavaScript. Keep shared styles small and component-specific styles with their components. Follow Neostandard's semicolon-free JavaScript style. Comments should explain the adjacent code or an invariant, not narrate a refactor.

Keep the default gentle and challenge presets optional. Keep Speedrun optional; do not introduce a compulsory timer or score pressure. Do not cap undo, charge for hints, penalize resetting, or call a budget-limited search a proven deadlock. Preserve country identity in every solver and generator check. Keep geography geometry distinct from the schematic puzzle terrain.

Run `npm run check` to apply available ESLint/Stylelint fixes and build, then play through `docs/MANUAL_CHECKLIST.md` before a release. There is no automated test suite. Prototype seeds and saves may break; do not add compatibility aliases, migrations, replacement boards, or archived content. Use `npm run lint` for read-only checks or `npm run lint:fix` to fix without building. Review and commit autofixes; CI uses them for the build but does not push them. After changing dependencies, run `npm install` and commit the reviewed `package-lock.json` together with `package.json` before running CI. Keep third-party notices and map provenance current. No telemetry or new external requests without an explicit design decision.

## Coding Standards & Architecture Guidelines

### No Dense One-Liners or Code Packing
- NEVER pack multiple statements on a single line using semicolons.
- NEVER write single-line function declarations or block bodies (e.g. `if (cond) { doA(); return }`). Always expand braces across multiple lines.
- Break down dense functional pipelines: avoid chaining `.map()`, `.filter()`, and nested ternaries inside a single expression. Use intermediate, descriptively named variables.

### Meaningful Comments are Required
- Explain the **WHY**, not the **WHAT**: Do not explain standard framework syntax. Explain domain rules, game state transitions, race-condition guards, mathematical formulas, and magic numbers (e.g., why a timeout is 2800ms).
- Every non-trivial reactive watcher or computed property must have a 1–2 line comment explaining the scenario it reacts to.
- Complex helper functions and coordinate transformations must have JSDoc or descriptive header comments.

### Vue SFC Guidelines
- **Template Line Wrapping**: Never place more than 3 attributes on a single line. When a tag wraps, place each attribute on its own line.
- **Component Decomposition**: If a component contains modal dialogs, HUD controls, or screen overlays, extract them into dedicated subcomponents instead of embedding their markup in the parent page.
- **Composable Extraction**: State machines, delivery timers, and complex accessibility aggregations must be extracted into composables (`use...()`).
- **CSS Hygiene**: NEVER write minified, single-line CSS rule sets. Every declaration belongs on its own line with 2-space indentation. Separate selectors with an empty line.
