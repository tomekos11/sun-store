<template>
  <USlideover
    v-model:open="open"
    title="Filters"
    side="left"
    :ui="{ body: 'sm:p-6' }"
  >
    <template #body>
      <CatalogFilterPanel
        :filters="filters"
        :facets="facets"
        @update="emit('update', $event)"
      />
    </template>
    <template #footer>
      <div class="flex w-full gap-2">
        <UButton
          v-if="activeCount"
          label="Clear"
          color="neutral"
          variant="outline"
          @click="emit('clear')"
        />
        <UButton
          :label="`Show ${total} ${total === 1 ? 'product' : 'products'}`"
          block
          :loading="pending"
          @click="open = false"
        />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { CatalogFacets } from '#shared/types/catalog'
import type { ProductFilters } from '#shared/utils/filters'

defineProps<{
  filters: ProductFilters
  facets: CatalogFacets
  total: number
  pending: boolean
  activeCount: number
}>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  update: [patch: Partial<ProductFilters>]
  clear: []
}>()
</script>
