# Difficulty and generation — 0.2.5

## Three choices

Easy shows faded destination flags. Medium uses question marks with exactly the same mechanical puzzle family. Hard combines hidden targets with stronger box-interaction filters. Mode and difficulty are independent; there is no region picker. Daily is the initial mode.

Hints, geography reveals, unlimited undo, zero-count restart and reduced motion remain available in all three. No score penalties, gameplay timer or cooldown are introduced. The first fixed story lessons may be very simple; the new acceptance floor applies to generated daily/random boards and their fallback pool, not the unchanged 42 story drafts.

## Minimum obstacle contribution: five total moves

Let `M(board)` be the minimum legal count of walking steps plus pushes to put every flag on its own destination. The acceptance requirement is:

```text
M(actual board) - M(same board with obstacles = []) >= 5
```

The baseline preserves the same floor cells, coastline, islands, player, flags, country assignments and targets. It removes only placed blocking objects. It does not fill oceans, remove islands, remove the other boxes or turn the whole bounding rectangle into land. This comparison isolates the contribution of designed barriers instead of attributing the original geography to those barriers.

`src/core/difficulty.js` defines `MINIMUM_EXTRA_MOVES = 5` and `certifyMoveGap`. Both A* searches minimize total moves, not pushes. Each macro edge costs the shortest walk to the relevant side of a flag plus the push. Exact player positions remain in state keys, unlike the push-only solver's reachable-region equivalence. The admissible heuristic ignores other boxes and includes a lower bound on walking to the first push.

A completed search provides an optimum and a replayable solution. If either search exhausts its budget, the gap is **uncertified**, not zero and not proof of impossibility. The candidate is not accepted. Neither a Manhattan distance nor a constructive scramble route substitutes for an optimum.

The level stores both optimum costs, their difference and both solution paths in `moveCertificate`. Runtime fallback validation checks metadata and replay. Offline tests independently recompute both optima for every frozen fallback. Raising the configured minimum also requires rebuilding that pool; do not silently accept old five-move certificates for a ten-move policy.

## More than a longer walk

Five extra moves alone can still describe a tedious detour. The generator therefore also uses designed goal gates and a separate push-optimal analysis:

- Every flag must require at least two pushes. At least one filled destination must obstruct another flag's relaxed route, creating a delivery-order dependency.
- Easy/Medium: 10–28 optimum pushes and at least two direction changes in the chosen push-optimal solution.
- Hard: 22–65 optimum pushes, at least four pushes beyond the independent-box relaxed lower bound, at least two pushes away from a destination, and at least one return to a previously moved flag in that solution.

The relaxed lower bound retains terrain but ignores the other flags. Exceeding it means the problem is not just three independent direct deliveries. Recorded away-push and revisit counts characterize the selected push-optimal solution; they do not prove every possible optimal solution has identical choreography. They are structural filters, not proof of fun, human difficulty or educational effectiveness.

A goal placed in a constrained passage makes delivering it too early consequential. Reverse parking is used for Hard. These remain ordinary Sokoban rules—no timed or disappearing floors, switches, literal sliding doors or hidden movement rules.

## Search, certification and fallback

The generator rasterizes geography, chooses countries and legal destinations, builds goal-gate barriers, then uses reversible pulls to construct a solvable starting state with uncovered targets. It replays the constructive route, independently solves for push quality, then certifies the two move optima. Candidates failing any acceptance check are replaced.

Candidate limits are 48 for gentle layouts and 64 for Hard. Expanded-state work limits are 100,000 and 180,000 respectively; candidate solver calls have their own bounds. Coverage thresholds vary deterministically across attempts. These are computational budgets, not timeouts. There is no general failure-directed local-repair pass in this version.

Exhaustion selects from 48 separately frozen boards: three per internal projection (including Caribbean) and mechanical family. Each has the same design and move-gap requirements. Selection uses the requested code, map version, generator version and fallback version, never device elapsed time. Story changes do not alter the pool. Technical failures remain distinguishable from normal search exhaustion.

The current development benchmark used fallback for 19 of 28 requests. There are only three fallback variants per projection/family, so repeated random codes can repeat layouts. This is a known diversity limitation, not a claim of unlimited fresh content. See `BENCHMARKS.md`.

## Help and feedback

Movement hints progress immediately on request: useful box → useful push positions → player route → a delivery checkpoint. Routes advance while followed and never execute moves. There is no hint delay, skip-delay link or reveal quota. Geography clues reveal destinations separately. Correct delivery labels the flag itself.

A proven deadlock shows an animated top overlay with Undo (Z) and Restart (R); inconclusive checks stay silent. Completion holds the final country name for 1.1 seconds, shows “Level clear!” for 0.9 seconds, then opens results. Reduced motion removes animation, not reading time.

## Human review

Keep Easy approachable for geography students, and evaluate Medium's recall challenge separately from Sokoban experience. Watch for arbitrary walking, accidental early goal blocking, repeated fallback recognition and excessive hint dependence. The new numerical floor is a minimum contribution test, not a complete difficulty model. No human playtesting results are claimed.
