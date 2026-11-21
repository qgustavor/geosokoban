# Styling

Use plain CSS and Vue single-file components. Keep a component's template, script and scoped styles together; centralizing a palette does not require extracting component CSS. There is no component library, preprocessor, theme engine or separate formatter.

## Ownership

```text
src/style.css                 Document defaults, shared controls and accessibility.
src/styles/theme.css          UI colors, shadows and shared control metrics.
src/styles/art-tokens.css     Board, character, terrain and story paint.
src/styles/biome-tokens.css   Ground and edge paint for the biome palettes.
src/ui/*.vue                  Component markup, behavior and <style scoped>.
src/pages/*.vue               Route markup, behavior and <style scoped>, as needed.
```

`main.js` imports `src/style.css` once. That stylesheet imports the three palette files. Component layout, states, responsive rules and animations stay in the component's `<style scoped>` block, not a parallel directory of stylesheets. `App.vue` owns the shell, header, pause actions and generation-error panel; `CreditsView.vue` owns its page and dialog layouts; `PuzzlePage.vue` owns its pending-route message.

## Palette and shared controls

Edit meaningful UI roles in `theme.css`, such as `--color-primary-bg`, `--color-text-muted` or `--color-dialog-bg`. Consume them directly in SFC styles:

```vue
<style scoped>
.example-panel {
  color: var(--color-text);
  background: var(--color-dialog-bg);
  border: 1px solid var(--color-dialog-border);
  border-radius: var(--radius-dialog);
  padding: var(--space-5);
}
</style>
```

The existing colors are retained. Distinct UI and artwork roles are not merged just because they happen to have the same value. Shared spacing, fonts, radii and cosmetic transition durations also have named properties. Keep one-off dimensions, SVG geometry, responsive breakpoints and animation choreography with their component; not every number needs a global variable.

Shared controls in `src/style.css` include `.button.primary`, `.button.secondary`, `.quiet`, `.choice-card` and `.check-control`. Mode and difficulty cards share their mechanics while their SFCs set layout and selected-state properties. Do not copy the same control declarations into multiple pages, and do not move a one-component rule into the shared stylesheet.

Color literals belong in the three palette files. Stylelint rejects hex colors, named colors and direct color-constructor functions in other CSS, including Vue style blocks. `transparent`, `currentColor`, `none` and inherited colors remain valid. Vue selector and `v-bind()` support remains configured for SFCs. Palette files are still checked for syntax and other correctness rules.

## Artwork and runtime values

Use the same palette properties in SVG presentation attributes and in `src/scenery/palettes.js`. Stylelint does not inspect JavaScript strings or SVG attributes, so review those separately:

```html
<path fill="var(--art-globe-land)" stroke="var(--art-globe-outline)" />
```

`art-tokens.css` holds board markers, character and terrain paint, story-stage colors, clear lettering and the unchanged ocean-pattern asset. `biome-tokens.css` holds the ground and edge values used by `palettes.js`; keep their names aligned. Flags, the static favicon and browser metadata, and the Tiled editor tileset are separate assets, not UI palette entries.

Do not change palette selection order, map geometry, collision cells or random draws to change paint. Keep CSS timings that coordinate with JavaScript in their existing runtime custom properties; do not replace them with cosmetic theme durations.

## Accessibility and workflow

Keep keyboard focus outlines, accessible hidden labels, safe-area offsets and both saved and system reduced-motion preferences. Component-specific motion exceptions stay in the SFC; document-wide overrides stay in `src/style.css`.

Run `npm run lint:fix` while editing and `npm run check` before committing. `npm run lint` remains a read-only check. No dependencies, formatter, hooks or test suite are required by this organization. Put each declaration on its own line with two-space indentation and blank lines between rules.

Follow `MANUAL_CHECKLIST.md` for browser review: menu and in-game dialogs, desktop and narrow screens, keyboard focus, all three locales, hints/results, land and sea boards, and reduced motion. Passing lint and build checks does not establish that those states look or play correctly.
