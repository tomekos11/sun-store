<template>
  <div class="space-y-2">
    <UInput
      v-if="searchable && options.length > limit"
      v-model="search"
      icon="i-lucide-search"
      size="sm"
      variant="soft"
      :placeholder="`Find ${label.toLowerCase()}`"
      :aria-label="`Find ${label.toLowerCase()}`"
      class="w-full"
    />

    <ul class="space-y-0.5">
      <li
        v-for="option in visible"
        :key="option.value"
      >
        <UCheckbox
          :model-value="selected.includes(option.value)"
          :disabled="option.count === 0 && !selected.includes(option.value)"
          :ui="{ root: 'py-1 items-center', wrapper: 'flex-1 min-w-0', label: 'flex items-center justify-between gap-2 font-normal' }"
          @update:model-value="toggle(option.value, $event)"
        >
          <template #label>
            <span class="truncate">{{ option.label }}</span>
            <span class="text-xs text-muted tabular-nums">{{ option.count }}</span>
          </template>
        </UCheckbox>
      </li>
    </ul>

    <p
      v-if="searchable && search && !filtered.length"
      class="text-sm text-muted"
    >
      No matches.
    </p>

    <UButton
      v-if="!search && (hiddenCount > 0 || expanded)"
      variant="link"
      size="sm"
      color="neutral"
      class="px-0"
      :trailing-icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : `Show all (${hiddenCount} more)` }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { FacetOption } from '#shared/types/catalog'

const props = withDefaults(defineProps<{
  label: string
  options: FacetOption[]
  selected: string[]
  limit?: number
  searchable?: boolean
}>(), {
  limit: Infinity,
  searchable: false,
})

const emit = defineEmits<{ 'update:selected': [value: string[]] }>()

const expanded = ref(false)
const search = ref('')

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? props.options.filter(o => o.label.toLowerCase().includes(term)) : props.options
})

const visible = computed(() => {
  if (expanded.value || search.value || filtered.value.length <= props.limit) return filtered.value
  // show the biggest ones, but always keep checked options visible
  const top = new Set([...filtered.value].sort((a, b) => b.count - a.count).slice(0, props.limit).map(o => o.value))
  return filtered.value.filter(o => top.has(o.value) || props.selected.includes(o.value))
})

const hiddenCount = computed(() => filtered.value.length - visible.value.length)

function toggle(value: string, checked: boolean | 'indeterminate') {
  const next = checked === true
    ? [...props.selected, value]
    : props.selected.filter(v => v !== value)
  emit('update:selected', next)
}
</script>
