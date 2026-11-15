import { move } from './engine.js'

/** Clues end at a meaningful push group or at the next newly completed destination. */
export function makeHintPlan (level, start, directions) {
  const records = []
  let state = start
  for (const direction of directions) {
    const next = move(level, state, direction)
    if (next === state) throw new Error('Hint contains an illegal move')
    const box = next.boxes.find((box, index) => box.position !== state.boxes[index].position)
    const delivered = box && level.goals.some(goal => goal.country === box.country && goal.position === box.position)
    records.push({ direction, player: next.player, from: state.player, box: box?.id, country: box?.country, boxPosition: box?.position, delivered })
    state = next
  }
  const firstPush = records.findIndex(record => record.box)
  if (firstPush < 0) return null
  const first = records[firstPush]
  let pushes = 0
  let end = firstPush
  for (let index = firstPush; index < records.length; index++) {
    const record = records[index]
    if (record.box && record.box !== first.box) break
    if (record.box) {
      pushes++
      end = index
      if (pushes >= 3 || record.delivered) break
    }
  }
  const checkpoint = records.findIndex(record => record.delivered)
  const segment = records.slice(0, end + 1)
  const delivery = records.slice(0, checkpoint < 0 ? end + 1 : checkpoint + 1)
  return { boxId: first.box, country: first.country, firstPush, segment, delivery, pushes: segment.filter(record => record.box).length }
}

export function hintOverlay (plan, stage, start) {
  if (!plan || stage < 1) return { boxId: null, pushes: [], route: [] }
  const records = stage === 4 ? plan.delivery : plan.segment
  return {
    boxId: plan.boxId,
    pushes: stage >= 2 ? records.filter(record => record.box).map(record => ({ country: record.country, position: record.boxPosition })) : [],
    route: stage >= 3 ? [start.player, ...records.map(record => record.player)] : []
  }
}

export function advanceHintPlan (level, plan, stage, previous, next) {
  const records = stage === 4 ? plan.delivery : plan.segment
  const first = records[0]
  if (!first || next.moves !== previous.moves + 1) return null
  const expected = move(level, previous, first.direction)
  if (expected === previous || expected.player !== next.player || expected.boxes.some((box, index) => box.position !== next.boxes[index].position)) return null
  const segment = plan.segment.slice(1)
  const delivery = plan.delivery.slice(1)
  const upcoming = (stage === 4 ? delivery : segment).find(record => record.box)
  return {
    ...plan,
    segment,
    delivery,
    boxId: upcoming?.box ?? plan.boxId,
    country: upcoming?.country ?? plan.country,
    complete: (stage === 4 ? delivery : segment).length === 0
  }
}
