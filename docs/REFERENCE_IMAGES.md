# Original-game visual references

## Source and scope

These notes refer to the five images in the user-supplied `original-game-reference-images.zip`. They are observations of those images, not an inspection of GeoJogos source code or a live-site audit. The screenshots are not redistributed with the prototype, and no permission to reuse their artwork is assumed.

The separate Firefox console and partial-page screenshots show the prototype's rendering failure; they are not images of the original game.

## Visible reference details

| File | What the image establishes |
| --- | --- |
| `main-menu-top.jpg` | A GeoJogos game catalogue with a dark teal background, rounded cards, chunky rounded lettering, raised pastel buttons, and per-game mode choices. |
| `main-menu-down.jpg` | More of that catalogue, including a GeoSokoban card with Clássico and Competição actions. This is a catalogue-level choice, not the prototype's Story/Daily/Random selector. |
| `difficulty-select.jpg` | A Competição setup screen with a continent selector, four difficulty cards and a prominent bottom action. The difficulty cards describe 4/6/8/10 flags and 10/15/20/25 percent obstacles. Those labels do not establish how the generator is implemented. |
| `board-start-state.jpg` | A rectangular purple tile board with a compass player, opaque flags and striped obstacle tiles. Four outlined destination cells are occupied by opaque flags in this image. A visible score, move count, timer, touch direction buttons and undo/restart controls surround the board. |
| `board-mid-state.jpg` | The matching outlined destination cells are exposed after flags have moved. They contain smaller, faded flag images inside green dashed outlines. The direction buttons and undo/restart controls remain prominent. |

Both board captures are labelled Competição. They do not establish how the original game's other mode handles score or timing. Static screenshots also do not prove generation quality, animation behavior, the size of the undo history, or whether restart resets counters.

## How these references affect the prototype brief

The reference targets confirm the requested default treatment: small, faded expected flags rather than generic destinations. Generic numbered targets remain an optional geography challenge, not the default. The initial prototype state must still leave destinations unobscured, as specified in the brief.

The obvious touch controls, readable flags and differentiation between movable flags and destination clues are useful interaction references. The prototype should retain accessible keyboard input and its existing touch controls. It should not copy copyrighted graphics or the catalogue wholesale.

The references do not reverse the agreed changes: there is no player-selected continent, no visible score, no gameplay timer, and no difficulty definition based solely on the count or percentage of randomly placed obstacles. The prototype retains geographic island/boat boards, a globe character, three game modes, optional geography/puzzle challenges, unlimited undo and free restart.

This release corrects rendering. It does not introduce a visual redesign to match the original game's palette, typography or button styling.
