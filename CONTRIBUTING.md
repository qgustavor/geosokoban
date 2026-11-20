# Contributing

Keep this a small, independent exploration that is easy for the original GeoJogos author to inspect. Prefer a focused, playable change over speculative infrastructure.

Write source and project documentation in English. UI strings belong in the three dictionaries in `src/data/messages.json`; add matching keys and placeholders in every locale. Country facts need a recorded, reliable geography source. Do not put debugging or implementation explanations into player-facing messages.

Use Vue `.vue` single-file components with `<script setup>` for interface elements. Keep movement, solving, generation and validation in framework-independent JavaScript. Keep shared styles small and component-specific styles with their components. Follow Neostandard's semicolon-free JavaScript style. Comments should explain the adjacent code or an invariant, not narrate a refactor.

Keep the default gentle and challenge presets optional. Do not add a gameplay timer to the prototype. Do not cap undo, charge for hints, penalize resetting, or call a budget-limited search a proven deadlock. Preserve country identity in every solver and generator check. Keep geography geometry distinct from the schematic puzzle terrain.

Install with `npm ci`. Run `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e` before publishing a change; install Chromium with `npx playwright install chromium` before the first browser run. Add a regression test for a rules bug. Support only the current puzzle and preference formats; do not add compatibility aliases or save migrations. Version intentional generator/content changes to invalidate cached boards. Commit a reviewed lockfile when intentionally changing dependencies; do not regenerate it in CI. Keep third-party notices and map provenance current. No telemetry or new external requests without an explicit design decision.

The default branch publishes automatically only after the **Validate** job passes. Keep heavyweight benchmarks and content regeneration out of that gate. See `docs/DEPLOYMENT.md` for workflow behavior and repository settings.

## Tests

Keep the suite small and focused on observable behavior. Test moves, results, routes, saved state and worker responses by executing the relevant APIs or the running application. Add a regression case when it protects a real gameplay failure; do not expand coverage solely to increase a count.

Never inspect source files or compiled bundles with regular expressions, string matching or snapshots to prove behavior. Do not assert component structure, class names, CSS declarations, compiler output, exact generated layouts or benchmark timing thresholds. A refactor or a new visual/puzzle idea should not require rewriting tests unless its behavior changes. Reading level or geography data as fixtures is fine. Use `docs/TESTING.md` for the current commands and coverage.

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
