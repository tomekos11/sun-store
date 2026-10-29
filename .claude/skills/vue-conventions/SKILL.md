---
name: vue-conventions
description: Conventions for writing Vue components, composables and pages in this Nuxt 4 + Nuxt UI project. Use when creating or changing any .vue file, composable or anything in app/.
---

# Vue conventions

## SFC structure

- Block order: `<template>`, then `<script setup lang="ts">`, then `<style>` (enforced by `vue/block-order`).
- Composition API with `<script setup lang="ts">` only. No Options API, no `defineComponent` in .vue files.
- Props and emits with type-based declarations:
  ```ts
  const props = defineProps<{ product: Product, query?: string }>()
  const emit = defineEmits<{ update: [patch: Partial<ProductFilters>] }>()
  ```
  `withDefaults` for defaults, `defineModel` for `v-model`.
- No `<style>` blocks, styling is Tailwind classes. Use Nuxt UI tokens (`text-muted`, `text-highlighted`, `bg-default`, `border-default`, `text-primary`), not raw colors like `text-gray-500`.

## Imports

- Vue and Nuxt APIs (`ref`, `computed`, `watch`, `useRoute`, `useFetch`...) and anything from `app/utils`, `app/composables`, `shared/utils` are auto-imported. Don't import them.
- Types are imported explicitly: `import type { Product } from '#shared/types/catalog'`.
- Libraries are imported explicitly (`import { watchDebounced } from '@vueuse/core'`).

## State and data

- Listing state lives only in the URL. Read and change it via `useProductFilters()`. No Pinia, no local copies of filters.
- Components don't touch the router. They get `filters` as a prop and emit an `update` with a partial patch. The page calls `update()`.
- Data comes from `useFetch('/api/products', { query })` in the page. Components don't fetch.
- Inputs that change often (slider, search) keep a local draft and commit to the URL on release or debounce, so one interaction = one history entry.

## Where logic goes

- Components stay thin. Filtering, parsing, formatting and SEO logic go to plain functions in `shared/utils/` or `server/lib/`, with a Vitest test in `tests/unit/`.
- Formatting prices and units: `formatPrice`, `formatSpec`, `formatRange` from `shared/utils/format.ts`. Don't call `Intl` in components.

## UI

- Use Nuxt UI components (`UButton`, `UCheckbox`, `USlider`, `USelect`, `UBadge`...) before writing custom markup. API reference: `https://ui.nuxt.com/raw/docs/components/<name>.md`.
- Icons: `i-lucide-*` only (bundled at build time).
- Components that are rarely shown (drawers, modals) are rendered with the `Lazy` prefix and `v-if`.

## Accessibility

- Icon-only buttons need `aria-label`.
- Heading levels: page `h1`, sections `h2`, cards and filter groups `h3`.
- Ids in components that can render twice (sidebar + mobile drawer) come from `useId()`.
- No `v-html`. For highlighted text use `CatalogHighlightedText`.

## Tests

- Add `data-testid` only where e2e needs a stable hook.
- After changes run: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` for anything that touches the page.

## Style

- UI copy in English, plain ASCII quotes.
- Comments only where the code is not obvious, one short line, explaining why.
