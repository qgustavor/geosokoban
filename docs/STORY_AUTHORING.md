# Authoring the story

## Campaign order

The campaign makes **three complete world tours**, each visiting South America,
North America, Eastern Europe, Western Europe, Africa, Asia, and Oceania.
There are still 21 puzzles (42 stored boards including Hard variants).

Tour 1 uses the former S1 boards, tour 2 uses S2, and tour 3 uses S3. North America's
third-tour board is the Caribbean map. The certified puzzle geometry and solution
paths have not been regenerated.

## Write a scene

Edit `src/content/story-dialogue.js`. `STORY_SCENES` is indexed by `tour:region`,
for example `1:SA`, `2:AF`, or `3:OC`. Region IDs are listed in
`src/content/regions.js`.

Each slot accepts `before` and `after` scenes:

```js
'2:WE': {
  before: {
    cast: ['globe'],
    lines: [
      {
        speaker: 'globe',
        expression: 'thinking',
        text: {
          en: 'Another clue in {region}. Let’s keep this passage open.',
          'pt-BR': 'Outra pista em {region}. Vamos manter esta passagem livre.',
          es: 'Otra pista en {region}. Mantengamos este paso libre.'
        }
      }
    ]
  },
  after: {
    lines: [
      { speaker: 'globe', text: 'A note! Someone was trying to help.' }
    ]
  }
}
```

The example is a property inside `STORY_SCENES`, not a separate module.
`text` accepts a plain string or a dictionary with `en`, `pt-BR`, and `es`.
A missing language falls back to English. `{region}`, `{tour}`, and `{stop}` are
available as substitutions. Plain strings are displayed unchanged in every language.

A missing `before` scene uses the existing region briefing from
`src/data/messages.json`. A missing `after` scene proceeds without dialogue.
Use `{ lines: [] }` to deliberately suppress either scene. An omitted `cast` is
inferred from the line speakers. When supplying a cast, include every speaker
used in the scene.

The included dialogue is replaceable prototype copy: it introduces a mystery,
leaves clues during the second tour, and ends with a well-meaning, clumsy visitor
becoming the protagonist's friend. No branching or puzzle-specific story logic is
embedded in the components.

## Add a character and portraits

Edit `STORY_CHARACTERS` in the same file. Each character has a localized `name`, a
`side` (`left` or `right`), and a `portraits` dictionary:

```js
visitor: {
  name: { en: 'Your character name', 'pt-BR': 'Nome da personagem', es: 'Nombre del personaje' },
  side: 'right',
  art: 'spark',
  portraits: {
    neutral: new URL('../assets/visitor-neutral.png', import.meta.url).href,
    embarrassed: new URL('../assets/visitor-embarrassed.png', import.meta.url).href
  }
}
```

Supply those images in `src/assets/` before adding the URLs. Imported assets or
`new URL(..., import.meta.url)` work with the project's deployment subpath; avoid
root-relative URLs unless the site is hosted at the origin root.

A line's `expression` selects the speaking character's portrait. Other cast members
use `neutral`. Missing expressions also fall back to `neutral`. With no image,
`art: 'globe'` uses the existing protagonist, `mystery` uses a question-mark
placeholder, and `spark` uses a simple visitor placeholder. These placeholders
are not intended to dictate your final character designs.

To hide the visitor's identity, use `unknown` in earlier scenes and `visitor` in
the reveal. Cast is scene-wide: do not add the revealed character to an earlier
scene's cast unless they should already be visible.

## When scenes play

`before` plays when a story puzzle is opened. After a solved board's clear/results
sequence, **Next stop** opens `after`, then opens the next puzzle's `before` scene.
The final puzzle instead offers **Meet the visitor**, which opens the ending and
then returns to the menu. Daily and random modes have no story scenes.

**Next**, **Back**, and left/right arrow keys navigate the lines. **Continue**
finishes the last line. **Skip scene** (or Escape) skips the current scene, not the
puzzle or the next chapter. Text is shown immediately and never advances on a
timer. The native modal prevents background interaction, and game actions also
check the dialogue lock. Reduced-motion settings cover the portraits and dialog.

Solving a story puzzle saves both its completion and an unread-departure checkpoint.
Resuming after a tab close opens that closing scene rather than losing it—even
for the ending. Finishing or skipping it clears the checkpoint and travels on.
Reloading during dialogue replays that scene from its first line. Undo/restart
before departing clears the unread-departure checkpoint. Clearing progress clears
both completed puzzles and that checkpoint.

## Readable puzzle names

New random codes look like `asia-calm-kite-42`; daily codes look like
`south-america-2026-11-16`; story codes look like `oceania-tour-3`.
Hard appends `-hard`. No public seed-version prefix is added. Seed words remain
English across UI languages so copying a name always identifies the same board.

The menu no longer contains a seed input or level selector. Links still open
puzzles directly. The pause menu shows the readable code and offers **Copy puzzle
link**. Existing `G2-...` codes remain accepted for bundled boards, saved progress,
and project tools; no new versioning framework has been introduced.
