# Story authoring

The story is a handcrafted teaching mode, separate from date-seeded puzzles. The current 21 boards and draft dialogue are editable content; they are not procedurally generated when played. There is one board per chapter and no difficulty variants.

## Chapter order

`STORY_ITINERARY` in `src/content/regions.js` explicitly lists region IDs for each tour. The first two tours visit South America, North America, Eastern Europe, Western Europe, Africa, Asia and Oceania. The third visits the Caribbean in place of North America. Progress counts derive from these arrays, not from the number of daily-generation maps.

The chapter ID is `<region-slug>-tour-<number>`. For example, `caribbean-tour-3` is the existing Caribbean board and uses the `3:CAR` dialogue slot. The JSON key, board `id`, Tiled `id` and route use exactly the same value. No aliases are accepted.

To add a chapter, add its region to the itinerary, create a matching board, import it, and write its scenes. Each region can appear only once in a tour because the ID includes region and tour. Changing order or IDs may reset progress or invalidate links; this prototype does not migrate them.

## Boards

Runtime boards live in `src/content/story-levels.json`; their Tiled counterparts live in `levels/editable`. Export and import with:

```sh
npm run levels:export -- south-america-tour-2
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
```

The importer validates geometry and country identities and searches for a solution. It refuses an unsolved or uncertified import. It does not judge whether the level teaches well or is enjoyable. Play the edited chapter from its direct route and through the preceding chapter's transition.

Keep the runtime board and its editable source together in the same commit. Missing authored content is an error, not permission to generate a replacement. See `EDITING.md` for layer and dock requirements.

## Dialogue and characters

`src/content/story-dialogue.js` owns `STORY_CHARACTERS` and `STORY_SCENES`. Scenes are keyed by `tour:region`, with optional `before` and `after` entries. A line supplies a `speaker` and text in `en`, `pt-BR` and `es`; optional portraits and expressions belong to the character data.

An absent before-scene uses the translated region briefing. An absent after-scene continues immediately. An explicit scene with `lines: []` is silent. Author the final chapter's after-scene to lead into the aggregate story result. The current visitor character and plot remain drafts.

Keep movement instruction and geography lessons grounded in the actual board. Start with space to experiment and use later chapters to introduce planning gradually. Include countries beyond the most familiar examples where the geography and board permit them. Keep trivia sources in `SOURCES.md`, not as unsupported claims in dialogue.

## Progress and review

Completed chapter IDs and unread after-scenes are saved separately so reloading cannot skip an ending. Story difficulty is fixed and does not overwrite the player's daily difficulty preference. The optional Speedrun setting times an entire run; normal story play does not require it.

Use `MANUAL_CHECKLIST.md` to review a campaign. Story writing, a developed secondary character, and level progression are separate authoring work, not consequences of a successful solver run.
