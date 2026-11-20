# Authoring the three-tour story

## Campaign and teaching order

The 21 playable chapters make three world tours. Each visits South America,
North America, Eastern Europe, Western Europe, Africa, Asia, and Oceania in that
order. North America now uses its continental map in all three playable tours.
Story play always uses the standard curated board; daily and random generation
are unchanged. The additional stored Hard variants are not the playable campaign.

The globe repairs misplaced flags without knowing who moved them. Tour one
introduces the story, walking, pushing, undo, and changing sides before adding
small natural obstacles. Its first three boards have no obstacles; its first
two have only one flag. Oceania introduces water routes and island docks.

In tour two, someone has packed away the destination signs. The countries and
flags remain, but markers, dock connections, and destination coordinates are
hidden. Globe provides geography and culture clues, repeated through the Travel
guide. A player can reveal any destination, which also centers the map on it.
A correct delivery discovers that destination; a wrong flag does not. Reading
country information does not mark story play assisted; explicit reveals do.
The easy terrain keeps the focus on finding countries, not long pushing puzzles.

The signs return for tour three. Natural obstacles increase gradually and some
form short ridges or reefs. Globe reminds the player to leave pushing space,
walk around flags, use undo, and avoid trapping flags against edges. Country
lessons remain available. Terrain is schematic puzzle scenery, not a surveyed
map of real mountain or reef locations.

`src/content/story-rules.js` owns these teaching rules. Story rules override menu
preferences and incoming `?g=` queries, including after reload. Tour two uses
`remember` guidance **and** hides entire targets; the other tours use `learn`.
Daily/archived Remember mode retains its existing presentation.

## The ending: Pip

Only the final closing scene includes Pip, a friendly compass with a smiling
face. Earlier scenes show and name only Globe; there is no silhouette or
compass hint. Pip meant to help, but an unnoticed magnet stuck to its side
pulled its needle off course. Pip also packed away signs it thought were wrong.
Globe listens without blame, offers help, removes the magnet and moves it away,
and checks the map with Pip. They end as friends.

`src/ui/CompassIcon.vue` contains original SVG artwork matching Globe's rounded,
outlined style. Its `confused`, `settling`, and `oriented` appearances show the
magnet and tilted needle, then removal and settling, then a steady needle.
The dialogue narrates these changes, so the artwork is not required to understand
them. Reduced-motion preferences disable the needle transition.

## Dialogue, localization, and country lessons

Edit `src/content/story-dialogue.js`. `STORY_SCENES` uses keys such as `1:SA`,
`2:AF`, and `3:OC`, each with optional `before` and `after` scenes. Every current
chapter has a briefing. Missing or empty scenes are skipped; no replacement
copy or character is invented at runtime.

Each scene has `lines`, with `speaker`, `text`, and optional `expression` and
`stage` fields. Text can be a plain string or an `en`, `pt-BR`, `es` dictionary;
a missing translation falls back to English. The helper `globe(en, pt, es)`
creates an ordinary Globe line. `{region}`, `{tour}`, and `{stop}` substitutions
are available. All supplied dialogue and country notes cover all three locales.

A scene can supply a `cast` array; otherwise the speakers determine the cast.
Do not add Pip to an earlier scene: cast members are visible throughout a scene.
Characters are registered in `STORY_CHARACTERS`. `art: 'globe'` and
`art: 'compass'` use the built-in SVGs. Optional `portraits` map expressions to
imported image URLs, with `neutral` as the fallback.

Tours two and three append one lesson for each actual country goal on the
current board. `src/content/story-guide.js` combines the existing bundled
geographic relation with an original cultural note from `story-countries.json`.
The same function powers the replayable Travel guide, so dialogue cannot silently
teach a different set of countries from the board. See `STORY_SOURCES.md` for
cultural references and the compass explanation.

Stage directions are data, not one-way DOM effects. For example, a line can
contain `stage: { pip: 'settling' }`. `storyStage(scene, index)` folds directions
from the start through the current line. Going Back therefore restores the
magnet as well as the earlier words. The final scene sets all three appearances.

## Playback and progress

A `before` scene opens with its board. After the final flag is delivered, the
existing delivery hold and clear banner lead automatically to `after`, then the
next chapter. The final closing scene leads to journey results. There is no
per-chapter scoreboard interrupting the story.

Next, Back, and the arrow keys navigate lines. Continue finishes a scene; Skip
scene or Escape skips that scene, not the puzzle. There is no timed reading.
Closing or reloading with an unread closing scene preserves its checkpoint,
including the finale; that scene restarts at its first line on reload. Completing
or skipping it clears the checkpoint. Undo/restart before departure clears it.

## Boards and the editor

The authored boards and replayable solutions live in `story-levels.json`; matching
Tiled maps live in `levels/editable/`. Edit/export/import with the existing tools:

```sh
npm run levels:export -- west-europe-tour-3
npm run levels:import -- levels/editable/west-europe-tour-3.tmj --story
```

Imports validate geography and solvability. Keep a destination inside its country;
sea destinations use an offshore dock and a nearby country anchor. Preserve room
for the globe to get behind every flag. Do not turn natural terrain into long
maze walls or add parking/gate mechanics to the teaching campaign.

Optional `obstacleArt` maps obstacle cell positions to `ridge`, `boulder`, or
`reef`. It changes only artwork, not collision rules. The editor round-trips it,
discarding overrides for removed obstacles; newly painted obstacles use the
region's normal scenery. Edit that metadata when moving an authored range.

## Current balance reference

These are the stored, replay-verified routes, not frozen test expectations.
Moves include walking; pushes count flag movement. Third-tour push counts were
also independently obtained with the solver. Short routes and gentle terrain
are a starting point for child playtesting, not proof of perceived difficulty.

| Region | Tour 1: obstacles / moves / pushes | Tour 2: obstacles / moves / pushes | Tour 3: obstacles / moves / pushes |
| --- | --- | --- | --- |
| South America | 0 / 3 / 1 | 1 / 11 / 5 | 2 / 15 / 7 |
| North America | 0 / 4 / 2 | 1 / 19 / 5 | 3 / 26 / 8 |
| Eastern Europe | 0 / 7 / 3 | 1 / 11 / 5 | 4 / 29 / 9 |
| Western Europe | 1 / 16 / 4 | 1 / 24 / 6 | 5 / 43 / 10 |
| Africa | 1 / 22 / 4 | 2 / 29 / 6 | 6 / 47 / 11 |
| Asia | 2 / 23 / 5 | 2 / 18 / 6 | 7 / 34 / 12 |
| Oceania | 2 / 45 / 5 | 2 / 38 / 6 | 8 / 58 / 16 |

The finale requires the most pushes and has the longest stored route. The test
suite checks broad budgets and the teaching progression, not exact layouts,
solution strings, wording, artwork, or compiled output. Change the reference
table when reauthoring boards; do not turn it into a snapshot test.
