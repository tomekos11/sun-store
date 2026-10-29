<template>
  <UCard
    as="article"
    :ui="{ root: 'h-full flex flex-col', body: 'flex flex-1 flex-col gap-3 p-4 sm:p-5' }"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <UIcon
          :name="categoryIcon(product.category)"
          class="size-5"
        />
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">
          <CatalogHighlightedText
            :text="product.manufacturer"
            :query="query"
          />
        </p>
        <h3 class="font-semibold leading-snug text-highlighted">
          <CatalogHighlightedText
            :text="product.name"
            :query="query"
          />
        </h3>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <UBadge
        v-if="spec"
        :label="spec.label"
        :title="spec.title"
        color="primary"
        variant="subtle"
        size="md"
        class="font-semibold tabular-nums"
      />
      <UBadge
        v-if="showCategory"
        :label="categoryLabel(product.category)"
        color="neutral"
        variant="outline"
        size="md"
      />
    </div>

    <p class="line-clamp-3 text-sm text-muted">
      <CatalogHighlightedText
        :text="product.description"
        :query="query"
      />
    </p>

    <div class="mt-auto flex items-end justify-between gap-2 border-t border-default pt-3">
      <p class="text-lg font-bold tabular-nums text-highlighted">
        {{ formatPrice(product.price) }}
      </p>
      <p
        v-if="product.unitPrice"
        class="text-xs tabular-nums text-muted"
        :title="`Price per ${product.unitPrice.unit}`"
      >
        {{ formatUnitPrice(product.unitPrice) }}
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Product } from '#shared/types/catalog'

const props = defineProps<{
  product: Product
  showCategory?: boolean
  query?: string
}>()

const spec = computed(() => {
  const { capacityKwh, powerW } = props.product.specs
  if (capacityKwh !== null) return { label: formatSpec(capacityKwh, 'kWh'), title: 'Capacity' }
  if (powerW !== null) return { label: formatSpec(powerW, 'W'), title: 'Rated power' }
  return null
})
</script>
