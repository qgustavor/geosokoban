<script setup>
import { computed } from 'vue'
import countries from '../data/countries.json' with { type: 'json' }
import { flagUrls } from '../assets/flags.js'

const props = defineProps({ country: { type: String, required: true } })

const url = computed(() => {
  // Game content uses three-letter country codes; the flag manifest uses two-letter codes.
  const iso2 = countries[props.country]?.iso2
  return flagUrls[iso2] ?? flagUrls.xx
})
</script>

<template>
  <svg viewBox="0 0 4 3" aria-hidden="true" class="flag-art"><image :href="url" width="4" height="3" /></svg>
</template>
