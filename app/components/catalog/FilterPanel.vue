<template>
  <div class="space-y-6">
    <section :aria-labelledby="`${uid}-category`">
      <h3
        :id="`${uid}-category`"
        class="mb-2 text-sm font-semibold text-highlighted"
      >
        Category
      </h3>
      <CatalogFacetList
        label="Categories"
        :options="facets.categories"
        :selected="filters.categories"
        @update:selected="emit('update', { categories: $event })"
      />
    </section>

    <USeparator />

    <section :aria-labelledby="`${uid}-manufacturer`">
      <h3
        :id="`${uid}-manufacturer`"
        class="mb-2 text-sm font-semibold text-highlighted"
      >
        Manufacturer
      </h3>
      <CatalogFacetList
        label="Manufacturers"
        :options="facets.manufacturers"
        :selected="filters.manufacturers"
        :limit="8"
        searchable
        @update:selected="emit('update', { manufacturers: $event })"
      />
    </section>

    <template
      v-for="range in ranges"
      :key="range.key"
    >
      <USeparator />
      <section :aria-labelledby="`${uid}-${range.key}`">
        <h3
          :id="`${uid}-${range.key}`"
          class="mb-3 text-sm font-semibold text-highlighted"
        >
          {{ range.label }}
        </h3>
        <CatalogRangeFilter
          :label="range.label"
          :unit="range.unit"
          :step="range.step"
          :bounds="range.bounds"
          :model-value="range.value"
          :format="range.format"
          @update:model-value="emit('update', { [range.key]: $event })"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Bounds, CatalogFacets, NumericRange, SpecKind } from '#shared/types/catalog'
import type { ProductFilters } from '#shared/utils/filters'

const props = defineProps<{
  filters: ProductFilters
  facets: CatalogFacets
}>()

const emit = defineEmits<{ update: [patch: Partial<ProductFilters>] }>()

// rendered twice (sidebar + mobile drawer), so ids need to be unique
const uid = useId()

interface RangeSection {
  key: 'price' | SpecKind
  label: string
  unit: string
  step: number
  bounds: Bounds
  value: NumericRange
  format: (n: number) => string
}

const ranges = computed<RangeSection[]>(() => {
  const sections: RangeSection[] = []
  const { facets, filters } = props

  if (facets.price) {
    sections.push({ key: 'price', label: 'Price', unit: '€', step: 1, bounds: facets.price, value: filters.price, format: formatPrice })
  }
  for (const kind of relevantSpecs(filters.categories)) {
    const bounds = facets[kind]
    if (!bounds) continue
    const meta = SPEC_META[kind]
    sections.push({
      key: kind,
      label: kind === 'capacity' ? 'Capacity (batteries)' : 'Power (solar panels)',
      unit: meta.unit,
      step: meta.step,
      bounds,
      value: filters[kind],
      format: n => formatSpec(n, meta.unit),
    })
  }
  return sections
})
</script>
