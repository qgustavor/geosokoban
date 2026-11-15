# Contributing

Keep this a small, independent exploration that is easy for the original GeoJogos author to inspect. Prefer a focused, playable change over speculative infrastructure.

Write source and project documentation in English. UI strings belong in the three dictionaries in `src/data/messages.json`; add matching keys and placeholders in every locale. Country facts need a recorded, reliable geography source. Do not put debugging or implementation explanations into player-facing messages.

Use Vue `.vue` single-file components with `<script setup>` for interface elements. Keep movement, solving, generation and validation in framework-independent JavaScript. Keep shared styles small and component-specific styles with their components. Follow Neostandard's semicolon-free JavaScript style. Comments should explain the adjacent code or an invariant, not narrate a refactor.

Keep the default gentle and challenge presets optional. Do not add a gameplay timer to the prototype. Do not cap undo, charge for hints, penalize resetting, or call a budget-limited search a proven deadlock. Preserve country identity in every solver and generator check. Keep geography geometry distinct from the schematic puzzle terrain.

Run `npm test`, `npm run lint` and `npm run build` before a release. Add a regression test for a rules bug. Preserve existing puzzle codes; version intentional generator/content changes. Commit a reviewed lockfile after installing dependencies. Keep third-party notices and map provenance current. No telemetry or new external requests without an explicit design decision.
