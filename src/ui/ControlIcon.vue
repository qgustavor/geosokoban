<script setup>
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'undo'" d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12" transform="translate(0 -2)" />
    <path v-else-if="name === 'restart'" d="M4 9a8 8 0 1 1-.2 5M4 3v6h6" />
    <path v-else-if="name === 'hint'" d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0l-1 3H9Z" />
    <path v-else-if="name === 'menu'" d="M5 6h14M5 12h14M5 18h14" />
  </svg>
</template>

<style scoped>
svg { display: block; width: 24px; height: 24px; flex: none; }
</style>
