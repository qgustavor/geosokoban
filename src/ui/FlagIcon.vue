<script setup>
import { computed } from 'vue'
import countries from '../data/countries.json' with { type: 'json' }
import { flagUrls } from '../assets/flags.js'

const props = defineProps({ country: { type: String, required: true } })
const url = computed(() => flagUrls[countries[props.country]?.iso2] ?? flagUrls.xx)
</script>

<template>
  <svg viewBox="0 0 4 3" aria-hidden="true" class="flag-art"><image :href="url" width="4" height="3" /></svg>
</template>
