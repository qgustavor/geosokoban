# Story authoring

The story is a handcrafted teaching mode, separate from date-seeded puzzles. The 21 stored boards are the level designer’s editable starting point; the story integration does not redesign or regenerate them. There is one board per chapter, with no hard variants or difficulty selector.

## Plot and teaching progression

The player and Little Globe discover that flags have been misplaced around the world. They travel together to restore them, learning country curiosities on the way.

| Tour | Destinations | Story events |
| --- | --- | --- |
| 1 | Visible country flags (`learn`, the existing Easy presentation) | Discover the mix-up, learn to push flags, and complete the first trip. Return to South America. |
| 2 | Question marks (`remember`, the existing Medium presentation) | At the starting point, discover another mix-up and glimpse a distant, running round silhouette. Notice the `?` destinations. Restore the flags and return again. |
| 3 | Question marks (`remember`) | At the starting point, discover another mix-up and see the silhouette again. At the end of the trip, meet Compass and resolve the mystery. |

Compass explains that something strange happened while they were walking, and they kept getting turned around and bumping into the flags. Little Globe notices the attached magnet. The player and Little Globe remove it; the needle settles and Compass is relieved. The player, Little Globe and Compass become friends. There is no villain, confession of deliberate mischief, mysterious note, or early speaking role that reveals Compass before the ending.

The first two returns are the **before-scenes of the following South America chapters**, so the story actually returns to its starting point before discovering the new mix-up. The final meeting is the **after-scene of the last Oceania chapter**. The silhouette has no face, dial, hanging loop, magnet or name to give it away.

`storyGuidance()` in `src/content/regions.js` owns destination visibility. It applies to menu starts, direct chapter links, route navigation and resumed chapters without overwriting the preferred Daily/Archive difficulty. The existing Medium rules still allow help and reveal correctly delivered destinations. This is a presentation/teaching progression, not a change to puzzle layouts or an extra procedural search constraint.

The magnet is a cartoon story device, not a physics simulation: a real compass responds to the combined magnetic fields around it; this character’s erratic spinning is expressive animation. The game does not explain the fictional question-mark destinations as a real magnetic effect.

## Chapter order

`STORY_ITINERARY` in `src/content/regions.js` lists region IDs for each tour. The first two tours visit South America, North America, Eastern Europe, Western Europe, Africa, Asia and Oceania. The third visits the Caribbean in place of North America. Progress counts derive from these arrays, not from the number of daily-generation maps.

The chapter ID is `<region-slug>-tour-<number>`. For example, `caribbean-tour-3` uses the `3:CAR` dialogue slot. The JSON key, board `id`, Tiled `id` and route use exactly the same value. No aliases are accepted.

To add a chapter, add its region to the itinerary, create a matching board, import it, and write its scenes. Each region can appear only once in a tour because the ID includes region and tour. Changing order or IDs may reset progress or invalidate links; this prototype does not migrate them. Move the tour-boundary and ending scenes as needed when changing the itinerary.

## Design the boards

Runtime boards live in `src/content/story-levels.json`; their Tiled counterparts live in `levels/editable`. Export and import with:

```sh
npm run levels:export -- south-america-tour-2
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
```

The importer validates geometry and country identities and searches for a solution. It refuses an unsolved or uncertified import. It does not judge whether a level teaches well or is enjoyable. Play the edited chapter from its direct route and through the preceding chapter’s transition.

Keep the runtime board and its editable source in the same commit. Missing authored content is an error, not permission to generate a replacement. See `EDITING.md` for layer and dock requirements.

Begin with room to experiment, then introduce planning gradually. Include countries beyond the most familiar examples, particularly in Africa and Oceania. The designer owns flag selection, destinations, obstacles, starting positions, solution routes and the learning sequence. The presence of finished dialogue does not mean these boards have finished their design pass.

## Dialogue and character staging

`src/content/story-dialogue.js` owns `STORY_CHARACTERS` and `STORY_SCENES`. Scenes are keyed by `tour:region`, with optional `before` and `after` entries. Each line supplies a `speaker` and text in `en`, `pt-BR` and `es`.

A line’s optional `stage` replaces the whole visible cast. Its keys identify characters and its values identify poses. That stage remains until another line replaces it. Resolved lines carry complete snapshots, so Back restores the correct portrait and magnet state without a separate mutable story-state machine.

```js
{
  speaker: 'globe',
  text: text('...', '...', '...'),
  stage: { globe: 'neutral', compass: 'magnetized' }
}
```

The available portraits are Little Globe (`globe`), the anonymous silhouette (`silhouette`) and Compass (`compass`). Compass has `friendly`, `magnetized` and `relieved` poses. `CompassIcon.vue` uses the approved centered SVG geometry: the dial, stationary hub and needle pivot all meet at `(26, 27)`. Only the needle changes its angle. Paint lives in `src/styles/art-tokens.css`; component behavior and scoped CSS stay in the SFC.

The line immediately before magnet removal has `action: 'removeMagnet'`, which labels the existing advance button. Advancing shows the next line’s `relieved` stage and settles the needle. Back can replay this moment. Skip and Escape finish the scene through the existing continuation; no timed interaction, drag gesture or separate puzzle is required.

The needle chooses fresh turn directions, distances and pauses. It stops while the tab is hidden or when reduced motion is requested through either the game setting or operating system. Removing the magnet under reduced motion settles it immediately. Unmounting cancels the animation and removes its visibility listener. The west label is `W` in English and `O` in Portuguese and Spanish.

An absent before-scene uses the translated region briefing. An absent after-scene shows a matching country curiosity if available, otherwise continues immediately. An explicit scene with `lines: []` is silent. All lines appear immediately and wait for the player; there is no timed reading or typewriter effect.

## Country curiosities

`src/content/story-facts.json` contains original, short text in all three locales, keyed by the same country codes as board goals. Sources and the exact supported claims are in `STORY_FACTS.md`.

After solving a board, the dialogue selects one available fact from countries actually present in its goals. Selection uses the goal order and tour number; with the current boards, the 21 chapters discuss 21 different countries. A small flag appears beside the text. Facts are delivered **after** solving, so they do not give away hidden destinations during a puzzle.

Editing a level changes the eligible facts automatically. A country absent from the edited board cannot be mentioned by this selector. A country without an authored fact contributes no fact; when there are no matches, no replacement trivia is invented. Add a fact and its source when adding a new country to the teaching sequence. Existing introductions about sea travel must also be reviewed when changing board geography or mechanics.

## Progress and review

Completed chapter IDs and unread after-scenes are saved separately. Leaving or reloading during an after-scene replays that whole scene before moving on, including the ending. There is no mid-line checkpoint or compatibility migration. Clearing progress or restarting a completed campaign allows a fresh story run. The optional Speedrun setting remains independent of normal story play.

Use `MANUAL_CHECKLIST.md` to review the campaign. Level design, pacing, localization and accessibility need playtesting with the intended audience, beyond linting and a build.
