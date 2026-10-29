<template>
  <div class="space-y-3">
    <!-- padding so the thumbs at 0% / 100% don't get clipped by the scroll container -->
    <div class="px-2 py-1">
      <USlider
        v-model="draft"
        :min="lo"
        :max="hi"
        :step="step"
        :disabled="disabled"
        :aria-label="label"
        size="sm"
        @change="commit"
      />
    </div>
    <div class="flex items-center gap-2">
      <UInputNumber
        :model-value="draft[0]"
        :min="lo"
        :max="hi"
        :step="step"
        :step-snapping="false"
        :increment="false"
        :decrement="false"
        :disabled="disabled"
        :aria-label="`Minimum ${label.toLowerCase()} (${unit})`"
        size="sm"
        class="flex-1"
        @update:model-value="setBound(0, $event)"
      />
      <span
        class="text-dimmed"
        aria-hidden="true"
      >–</span>
      <UInputNumber
        :model-value="draft[1]"
        :min="lo"
        :max="hi"
        :step="step"
        :step-snapping="false"
        :increment="false"
        :decrement="false"
        :disabled="disabled"
        :aria-label="`Maximum ${label.toLowerCase()} (${unit})`"
        size="sm"
        class="flex-1"
        @update:model-value="setBound(1, $event)"
      />
      <span class="text-xs text-muted w-8">{{ unit }}</span>
    </div>
    <p class="text-xs text-muted tabular-nums">
      {{ format(draft[0]) }} – {{ format(draft[1]) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Bounds, NumericRange } from '#shared/types/catalog'

const props = defineProps<{
  label: string
  unit: string
  modelValue: NumericRange
  bounds: Bounds
  step: number
  format: (value: number) => string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: NumericRange] }>()

const decimals = (props.step.toString().split('.')[1] ?? '').length
const snap = (value: number) => Number(value.toFixed(decimals))
const lo = computed(() => snap(Math.floor(props.bounds.min / props.step) * props.step))
const hi = computed(() => snap(Math.ceil(props.bounds.max / props.step) * props.step))
const clamp = (value: number) => Math.min(hi.value, Math.max(lo.value, value))

function fromModel(): [number, number] {
  return [clamp(props.modelValue.min ?? lo.value), clamp(props.modelValue.max ?? hi.value)]
}

// local value while dragging, URL is updated on release
const draft = ref<[number, number]>(fromModel())
watch(() => [props.modelValue.min, props.modelValue.max, lo.value, hi.value], () => {
  draft.value = fromModel()
})

function commit() {
  const [a, b] = draft.value
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  // at the min/max bound = no filter
  emit('update:modelValue', { min: min <= lo.value ? null : min, max: max >= hi.value ? null : max })
}

function setBound(index: 0 | 1, value: number | null | undefined) {
  const next: [number, number] = [...draft.value]
  next[index] = clamp(value ?? (index === 0 ? lo.value : hi.value))
  draft.value = next
  commit()
}

const disabled = computed(() => lo.value >= hi.value)
</script>
