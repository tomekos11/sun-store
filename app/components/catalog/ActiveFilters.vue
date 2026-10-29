<template>
  <div
    v-if="chips.length"
    class="flex flex-wrap items-center gap-2"
  >
    <span class="sr-only">Active filters:</span>
    <UButton
      v-for="chip in chips"
      :key="chip.key"
      :label="chip.label"
      :aria-label="`Remove filter: ${chip.label}`"
      trailing-icon="i-lucide-x"
      color="neutral"
      variant="soft"
      size="sm"
      @click="emit('update', chip.patch)"
    />
    <UButton
      v-if="chips.length > 1"
      label="Clear all"
      color="neutral"
      variant="link"
      size="sm"
      @click="emit('clear')"
    />
  </div>
</template>

<script setup lang="ts">
import type { CatalogFacets } from '#shared/types/catalog'
import type { ProductFilters } from '#shared/utils/filters'

const props = defineProps<{
  filters: ProductFilters
  facets: CatalogFacets
}>()

const emit = defineEmits<{
  update: [patch: Partial<ProductFilters>]
  clear: []
}>()

interface Chip {
  key: string
  label: string
  patch: Partial<ProductFilters>
}

const empty = { min: null, max: null }

const chips = computed<Chip[]>(() => {
  const f = props.filters
  const manufacturerName = (slug: string) => props.facets.manufacturers.find(m => m.value === slug)?.label ?? slug
  const result: Chip[] = []

  for (const c of f.categories) {
    result.push({ key: `c:${c}`, label: categoryLabel(c), patch: { categories: f.categories.filter(x => x !== c) } })
  }
  for (const m of f.manufacturers) {
    result.push({ key: `m:${m}`, label: manufacturerName(m), patch: { manufacturers: f.manufacturers.filter(x => x !== m) } })
  }
  const price = formatRange(f.price, formatPrice)
  if (price) result.push({ key: 'price', label: `Price ${price}`, patch: { price: empty } })
  const capacity = formatRange(f.capacity, formatNumber, ' kWh')
  if (capacity) result.push({ key: 'capacity', label: `Capacity ${capacity}`, patch: { capacity: empty } })
  const power = formatRange(f.power, formatNumber, ' W')
  if (power) result.push({ key: 'power', label: `Power ${power}`, patch: { power: empty } })
  return result
})
</script>
