<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { labelPlacement, coastlineEdges } from '../core/presentation.js'
import { tileTransitionStyle, TILE_ENTER_MS, TILE_LEAVE_MS } from '../core/board-transition.js'
import { outlinesForLevel, contextForLevel, UNDERLAY_PIXELS_PER_CELL } from '../geo/outlines.js'
import { createBoardInput } from '../core/board-input.js'
import { initialCamera, clampCamera, cameraViewport, transformCamera, followPlayer } from '../core/board-camera.js'
import { createScenery } from '../scenery/scene.js'
import TerrainArt from './TerrainArt.vue'
import GroundDetail from './GroundDetail.vue'
import FlagIcon from './FlagIcon.vue'
import GlobeIcon from './GlobeIcon.vue'

const props = defineProps({
  level: { type: Object, required: true },
  state: { type: Object, required: true },
  labels: { type: Array, default: () => [] },
  facing: { type: String, default: 'down' },
  preview: Boolean,
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  showFlags: { type: Boolean, default: true },
  revealed: { type: Array, default: () => [] },
  overlay: { type: Object, default: () => ({ boxId: null, pushes: [], route: [] }) }
})

const emit = defineEmits(['inspect', 'key', 'destination', 'step', 'overview'])
const board = ref(null)
const stage = ref(null)
// The initial size supplies a viewport before the first ResizeObserver notification.
const size = ref({ width: 800, height: 800 })
const camera = ref(initialCamera(props.level, size.value, props.state.player, !props.preview))
let measured = false
let resizeObserver

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry.contentRect.width || !entry.contentRect.height) return
    resetInput()
    size.value = { width: entry.contentRect.width, height: entry.contentRect.height }
    camera.value = measured
      ? clampCamera(props.level, size.value, camera.value)
      : initialCamera(props.level, size.value, props.state.player, !props.preview)
    measured = true
  })
  resizeObserver.observe(stage.value)
  window.addEventListener('blur', resetInput)
  document.addEventListener('visibilitychange', resetInput)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('blur', resetInput)
  document.removeEventListener('visibilitychange', resetInput)
  resetInput()
})

watch(() => props.state.player, player => {
  camera.value = followPlayer(props.level, size.value, camera.value, player)
})

const viewport = computed(() => cameraViewport(props.level, size.value, camera.value))
const viewBox = computed(() => {
  const { x, y, width, height } = viewport.value
  return [x, y, width, height].join(' ')
})

function toggleOverview () {
  resetInput()
  camera.value = camera.value.zoom > 1.01
    ? initialCamera(props.level, size.value, props.state.player, false)
    : clampCamera(props.level, size.value, {
        ...initialCamera(props.level, size.value, props.state.player),
        zoom: Math.max(2, initialCamera(props.level, size.value, props.state.player).zoom)
      })
  board.value.focus({ preventScroll: true })
}

const coastlines = computed(() => {
  const floors = new Set(props.level.floors)
  const edgesByPosition = props.level.floors.map(position => [
    position,
    coastlineEdges(props.level, position, floors)
  ])

  return new Map(edgesByPosition)
})

const tileDelay = position => tileTransitionStyle(props.level, position)
const labelStyle = label => labelPlacement(props.level, label.position, viewport.value, size.value)

let pinchOrigin = null
let pinchRevision = -1
const input = createBoardInput(direction => emit('step', direction), change => {
  if (change.gesture !== pinchRevision) {
    pinchOrigin = camera.value
    pinchRevision = change.gesture
  }
  camera.value = transformCamera(props.level, size.value, pinchOrigin, change)
})

function point (event) {
  const rect = stage.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function capturePointers () {
  if (!input.captured) return
  for (const id of input.ids) {
    if (board.value.hasPointerCapture(id)) continue
    // A pointer can be cancelled by the OS between dispatch and capture.
    try {
      board.value.setPointerCapture(id)
    } catch {
      // Already released.
    }
  }
}

function pointerDown (event) {
  if (props.preview || event.button !== 0 || event.target.closest('button')) return
  const { x, y } = point(event)
  input.down(event.pointerId, x, y)
  capturePointers()
  board.value.focus({ preventScroll: true })
}

function pointerMove (event) {
  const { x, y } = point(event)
  input.move(event.pointerId, x, y)
  capturePointers()
}

function pointerEnd (event) {
  if (event.type === 'lostpointercapture' && event.target !== board.value) return
  const { x, y } = point(event)
  input.up(event.pointerId, x, y, event.type !== 'pointerup')
}

function pointerLeave (event) {
  if (!board.value.hasPointerCapture(event.pointerId)) {
    const { x, y } = point(event)
    input.up(event.pointerId, x, y, true)
  }
}

function resetInput () {
  pinchOrigin = null
  pinchRevision = -1
  const ids = input.ids
  input.reset()
  for (const id of ids) {
    if (board.value?.hasPointerCapture(id)) board.value.releasePointerCapture(id)
  }
}

function click (event) {
  if (event.target.closest('button') || !input.consumeClick()) return
  // Neither swipes nor pinches may also inspect the flag under the release position.
  event.preventDefault()
  event.stopPropagation()
}

function wheel (event) {
  if (props.preview) return
  event.preventDefault()
  resetInput()
  const from = point(event)
  const pixels = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.value.height : 1
  // Trackpad pinching is delivered as Ctrl+wheel; an ordinary two-finger scroll pans.
  const change = event.ctrlKey
    ? { from, to: from, scale: Math.exp(-Math.max(-200, Math.min(200, event.deltaY * pixels)) * 0.01) }
    : { from, to: { x: from.x - event.deltaX * pixels, y: from.y - event.deltaY * pixels }, scale: 1 }
  camera.value = transformCamera(props.level, size.value, camera.value, change)
}

const regions = computed(() => outlinesForLevel(props.level))
const context = computed(() => contextForLevel(props.level))
const scenery = computed(() => createScenery(props.level))
const prefix = computed(() => props.preview ? 'preview' : 'puzzle')

// Artwork uses a 40-unit tile grid. The SVG viewport handles screen scaling, so input and
// labels must not treat these coordinates as physical pixels on the resized board.
const x = position => (position % props.level.width) * 40
const y = position => Math.floor(position / props.level.width) * 40

const delivered = goal => props.state.boxes.some(box => box.position === goal.position && box.country === goal.country)
const route = computed(() => {
  // The path connects tile centers rather than their upper-left corners.
  const centers = props.overlay.route.map(position => `${x(position) + 20},${y(position) + 20}`)
  return centers.join(' ')
})

// Notify parent whenever zoom crosses the overview threshold:
const isOverview = computed(() => camera.value.zoom <= 1.01)
watch(isOverview, value => emit('overview', value), { immediate: true })

defineExpose({
  toggleOverview
})
</script>

<template>
  <div
    ref="board"
    class="board-wrap"
    :data-level="level.id"
    :data-zoom="camera.zoom"
    :class="{ 'board-preview': preview }"
    :style="{ '--tile-enter-duration': `${TILE_ENTER_MS}ms`, '--tile-leave-duration': `${TILE_LEAVE_MS}ms` }"
    :tabindex="preview ? -1 : 0"
    :role="preview ? undefined : 'group'"
    :aria-label="label"
    @keydown="$emit('key', $event)"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerEnd"
    @pointercancel="pointerEnd"
    @pointerleave="pointerLeave"
    @lostpointercapture="pointerEnd"
    @wheel="wheel"
    @contextmenu.prevent
    @click.capture="click"
  >
    <div ref="stage" class="board-stage">
      <svg
        :viewBox="viewBox"
        preserveAspectRatio="xMidYMid meet"
        class="board-svg"
        role="img"
        :aria-label="label"
        :aria-describedby="preview ? undefined : `${prefix}-description`"
      >
        <desc v-if="!preview" :id="`${prefix}-description`">{{ description }}</desc>
        <g
          class="map-outline"
          :class="{ islands: level.sea }"
          :data-pixels-per-cell="UNDERLAY_PIXELS_PER_CELL"
          shape-rendering="crispEdges"
        ><path
          v-for="region in context"
          :key="region.id"
          :d="region.path"
          fill-rule="evenodd"
        /></g>
        <g
          v-for="position in level.floors"
          :key="position"
          class="land-tile"
          :style="tileDelay(position)"
        >
          <rect
            :x="x(position)"
            :y="y(position) + 7"
            width="40"
            height="40"
            :fill="scenery.tiles.get(position).edge"
            class="tile-underface"
          />
          <rect
            :x="x(position)"
            :y="y(position)"
            width="40"
            height="40"
            :fill="scenery.tiles.get(position).ground"
            class="tile-surface"
            :class="{ 'water-tile': level.sea }"
          />
          <path
            v-if="!level.sea"
            :d="coastlines.get(position)"
            class="coast-edge"
            :stroke="scenery.tiles.get(position).edge"
          />

        </g>
        <g class="country-borders" shape-rendering="crispEdges"><path
          v-for="region in regions"
          :key="region.id"
          :d="region.path"
          fill-rule="evenodd"
        /></g>
        <!-- Decorations share the owning tile's timing, but never add new collision cells. -->
        <g
          v-for="detail in scenery.details"
          :key="`detail-${detail.position}`"
          :transform="`translate(${x(detail.position)},${y(detail.position)})`"
        >
          <g class="tile-pop" :style="tileDelay(detail.position)">
            <GroundDetail :kind="detail.kind" :corner="detail.corner" :phase="detail.phase" />
          </g>
        </g>
        <g
          v-for="obstacle in scenery.obstacles"
          :key="`obstacle-${obstacle.position}`"
          :transform="`translate(${x(obstacle.position)},${y(obstacle.position)})`"
        >
          <g class="tile-pop" :style="tileDelay(obstacle.position)">
            <TerrainArt :kind="obstacle.kind" :flip="obstacle.flip" />
          </g>
        </g>
        <g
          v-for="goal in level.goals"
          :key="goal.country"
          class="target tile-pop"
          :style="tileDelay(goal.position)"
          @click="$emit('destination', goal.country)"
        >
          <line
            v-if="level.sea && goal.anchor"
            :x1="x(goal.position) + 20"
            :y1="y(goal.position) + 20"
            :x2="goal.anchor[0] * 40"
            :y2="goal.anchor[1] * 40"
            stroke="#fcf0bc"
            stroke-width="2"
            stroke-dasharray="4 3"
          />
          <rect
            :x="x(goal.position) + 4"
            :y="y(goal.position) + 5"
            width="32"
            height="30"
            rx="7"
            class="goal"
            :class="{ 'solved-goal': delivered(goal) }"
          />
          <FlagIcon
            v-if="showFlags || revealed.includes(goal.country)"
            :country="goal.country"
            :x="x(goal.position) + 10"
            :y="y(goal.position) + 12"
            width="20"
            height="15"
            class="target-flag"
          />
          <text
            v-else
            :x="x(goal.position) + 20"
            :y="y(goal.position) + 26"
            class="goal-number"
          >?</text>
          <text
            v-if="delivered(goal)"
            :x="x(goal.position) + 35"
            :y="y(goal.position) + 8"
            class="delivered-mark"
          >✓</text>
        </g>
        <polyline v-if="route" :points="route" class="hint-route" />
        <g v-for="(push, index) in overlay.pushes" :key="`push-${index}`" class="push-marker">
          <rect
            :x="x(push.position) + 3"
            :y="y(push.position) + 3"
            width="34"
            height="34"
            rx="5"
          />
          <text :x="x(push.position) + 9" :y="y(push.position) + 13">{{ index + 1 }}</text>
        </g>
        <g
          v-for="box in state.boxes"
          :key="box.id"
          class="box-actor"
          :data-country="box.country"
          :style="{ transform: `translate(${x(box.position)}px,${y(box.position)}px)` }"
          @click="$emit('inspect', box.country)"
        >
          <g class="piece-reveal" :style="tileDelay(box.position)">
            <rect
              v-if="overlay.boxId === box.id"
              x="-2"
              y="-2"
              width="44"
              height="43"
              rx="9"
              class="hint-box"
            />
            <ellipse
              cx="20"
              cy="34"
              rx="16"
              ry="4"
              fill="#233d3955"
            />
            <rect
              x="2"
              y="7"
              width="36"
              height="28"
              rx="4"
              fill="#9a794b"
            />
            <rect
              x="2"
              y="4"
              width="36"
              height="28"
              rx="4"
              fill="#fffdf1"
              stroke="#405653"
              stroke-width="1.3"
            />
            <FlagIcon
              :country="box.country"
              x="5"
              y="7"
              width="30"
              height="22"
            />
          </g>
        </g>
        <g class="player-actor" :style="{ transform: `translate(${x(state.player)}px,${y(state.player) - 4}px)` }">
          <g class="piece-reveal" :style="tileDelay(state.player)">
            <path
              v-if="level.sea"
              d="M-2 32h44l-8 11H7Z"
              fill="#f8dfad"
              stroke="#294e52"
              stroke-width="1.5"
            />
            <GlobeIcon
              width="40"
              height="44"
              :direction="facing"
              :uid="`${prefix}-globe`"
            />
          </g>
        </g>
      </svg>
      <div
        v-for="delivery in labels"
        :key="delivery.id"
        class="flag-label"
        :style="labelStyle(delivery)"
        role="status"
      >
        <span>{{ delivery.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-wrap {
  position: relative;
  background: transparent;
  height: 100dvh;
  width: 100%;
  touch-action: none;
  overscroll-behavior: contain;
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

.board-wrap:focus-visible {
  outline-offset: -6px;
  outline-color: #f5d39f;
}

/* Reserve space for the HUD and controls, including device safe areas, before fitting the map. */
.board-stage {
  position: absolute;
  inset: max(76px, calc(env(safe-area-inset-top) + 52px)) 0 max(80px, calc(env(safe-area-inset-bottom) + 64px));
}

.board-svg {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: block;
}

.tile-surface {
  stroke: #657f60;
  stroke-opacity: 0.12;
  stroke-width: 0.65;
}

.water-tile {
  stroke: #d6efeb;
  stroke-opacity: 0.12;
  stroke-width: 0.55;
}

.coast-edge {
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-opacity: 0.65;
}

.map-outline {
  pointer-events: none;
  shape-rendering: crispEdges;
}

.map-outline path {
  fill: #a5bca0;
  stroke: none;
  opacity: 0.3;
}

.country-borders {
  pointer-events: none;
  shape-rendering: crispEdges;
}

.country-borders path {
  fill: none;
  stroke: #5b7f684f;
  stroke-width: 1.5;
  stroke-linejoin: miter;
  stroke-linecap: butt;
}

.goal {
  stroke: #ad6547;
  stroke-width: 2;
  fill: #fff6e9;
  stroke-dasharray: 4 2;
}

.solved-goal {
  fill: #adcda0;
  stroke: #3c7952;
  stroke-dasharray: none;
}

.goal-number {
  text-anchor: middle;
  fill: #81482e;
  font-size: 21px;
  font-weight: 750;
}

.box-actor,
.player-actor {
  transition: transform 0.12s ease-out;
}

.box-actor {
  cursor: pointer;
}

.flag-label {
  position: absolute;
  max-width: min(220px, calc(100% - 20px));
  width: max-content;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 3;
  text-align: center;
}

.flag-label span {
  position: relative;
  display: block;
  padding: 8px 13px;
  border-radius: 13px;
  border: 1px solid #d6e2bd;
  background: #f5f0d9;
  color: #244e58;
  font-size: 14px;
  line-height: 1.3;
  box-shadow: 0 3px 0 #1a485333;
  text-wrap: balance;
  animation: label-appear 0.2s ease-out both;
}

.flag-label span::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 9px;
  height: 9px;
  background: #f5f0d9;
  transform: translateX(-50%) rotate(45deg);
}

.board-preview {
  height: 100%;
}

.board-preview .board-stage {
  inset: 0;
}

.islands path {
  opacity: 0.75;
  fill: #dbe2af;
}

.target {
  cursor: pointer;
}

.target-flag {
  opacity: 0.4;
  pointer-events: none;
}

.delivered-mark {
  font-size: 16px;
  fill: #21513c;
}

.land-tile,
.tile-pop,
.piece-reveal {
  transform-box: fill-box;
  transform-origin: center bottom;
}

.tile-underface {
  opacity: 0;
}

.board-swap-enter-active,
.board-swap-leave-active {
  pointer-events: none;
}

.board-swap-enter-active .tile-underface,
.board-swap-leave-active .tile-underface {
  opacity: 1;
}

/* Build and dismantle share tile delays with the JavaScript transition duration. */
.board-swap-enter-active .land-tile,
.board-swap-enter-active .tile-pop,
.board-swap-enter-active .piece-reveal {
  animation-name: tile-build;
  animation-duration: var(--tile-enter-duration);
  animation-timing-function: cubic-bezier(0.16, 0.75, 0.25, 1);
  animation-fill-mode: both;
  will-change: transform, opacity;
}

.board-swap-leave-active .land-tile,
.board-swap-leave-active .tile-pop,
.board-swap-leave-active .piece-reveal {
  animation-name: tile-dismantle;
  animation-duration: var(--tile-leave-duration);
  animation-delay: var(--tile-leave-delay) !important;
  animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0.35);
  animation-fill-mode: both;
  will-change: transform, opacity;
}

/* Explicit keyframes also fade on first mount. A transition to opacity: 0 can
   otherwise miss its starting frame when Vue attaches the leave classes. */
.board-swap-enter-active .map-outline {
  animation: underlay-arrive 0.52s 0.08s both;
}

.board-swap-leave-active .map-outline {
  animation: underlay-depart 0.34s both;
}

.board-swap-enter-active .country-borders {
  animation: underlay-arrive 0.3s 0.5s both;
}

.board-swap-leave-active .country-borders {
  animation: underlay-depart 0.2s both;
}

.board-swap-leave-active .hint-route,
.board-swap-leave-active .push-marker,
.board-swap-leave-active .flag-label {
  visibility: hidden;
}

.hint-box {
  fill: none;
  stroke: #c35021;
  stroke-width: 3;
  stroke-dasharray: 5 3;
}

.hint-route {
  stroke: #a94620;
  stroke-width: 4;
  stroke-dasharray: 5 5;
  fill: none;
  opacity: 0.9;
  pointer-events: none;
}

.push-marker {
  pointer-events: none;
}

.push-marker rect {
  fill: #ffdf9b55;
  stroke: #a94620;
  stroke-width: 2;
}

.push-marker text {
  font-size: 11px;
  fill: #572a15;
  font-weight: 800;
  paint-order: stroke;
  stroke: #fff7df;
  stroke-width: 3;
}

@keyframes label-appear {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tile-build {
  0% {
    opacity: 0;
    transform: translateY(52px) scale(0.86, 0.12);
  }
  22% {
    opacity: 1;
  }
  72% {
    opacity: 1;
    transform: translateY(-5px) scale(1, 1.025);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

@keyframes tile-dismantle {
  0% {
    opacity: 1;
    transform: none;
  }
  25% {
    opacity: 1;
    transform: translateY(-4px) scale(1, 1.025);
  }
  100% {
    opacity: 0;
    transform: translateY(48px) scale(0.86, 0.12);
  }
}

@keyframes underlay-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes underlay-depart {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile-underface {
    display: none;
  }
}

:global(.reduced-motion) .tile-underface {
  display: none;
}
</style>

