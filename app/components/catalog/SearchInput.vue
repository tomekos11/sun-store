<template>
  <form
    role="search"
    class="flex-1"
    @submit.prevent="commit"
  >
    <UInput
      ref="input"
      v-model="value"
      type="search"
      name="q"
      icon="i-lucide-search"
      size="lg"
      placeholder="Search name, manufacturer or description..."
      aria-label="Search products"
      autocomplete="off"
      class="w-full"
      :ui="{ trailing: 'pe-2' }"
      @keydown.esc="clear"
    >
      <template #trailing>
        <UButton
          v-if="value"
          icon="i-lucide-x"
          color="neutral"
          variant="link"
          size="sm"
          aria-label="Clear search"
          @click="clear"
        />
        <UKbd
          v-else
          value="/"
          class="hidden sm:inline-flex"
        />
      </template>
    </UInput>
  </form>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ commit: [value: string, options: { replace: boolean }] }>()

const SESSION_MS = 1500

const value = ref(props.modelValue)
const input = useTemplateRef('input')
let lastCommitAt = 0

// sync when the URL changes from outside (back button, clear all)
watch(() => props.modelValue, (q) => {
  if (q !== value.value.trim()) value.value = q
})

function commit() {
  const q = value.value.trim()
  if (q === props.modelValue) return
  // push only the first change while typing, then replace - so back doesn't go letter by letter
  const now = Date.now()
  emit('commit', q, { replace: now - lastCommitAt < SESSION_MS })
  lastCommitAt = now
}

watchDebounced(value, commit, { debounce: 300 })

function clear() {
  value.value = ''
  lastCommitAt = 0
  commit()
  input.value?.inputRef?.focus()
}

defineShortcuts({
  '/': () => input.value?.inputRef?.focus(),
})
</script>
