<template>
  <UContainer
    as="main"
    class="py-6 sm:py-8"
  >
    <header class="mb-6">
      <UBreadcrumb
        v-if="breadcrumbItems.length > 1"
        :items="breadcrumbItems"
        :ui="{ link: 'text-sm' }"
      />
      <p
        v-else
        class="text-sm font-medium text-primary"
      >
        Product catalog
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
        {{ seo.heading }}
      </h1>
      <p
        v-if="data"
        class="mt-1 text-muted"
      >
        {{ data.total }} {{ data.total === 1 ? 'product' : 'products' }}<template v-if="data.priceRange">
          · from {{ formatPrice(data.priceRange.min) }}
        </template>
      </p>
    </header>

    <UAlert
      v-if="error && !data"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Products could not be loaded"
      :description="error.message"
      :actions="[{ label: 'Try again', color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <div
      v-else-if="data"
      class="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
    >
      <aside
        class="hidden lg:block"
        aria-labelledby="filters-heading"
      >
        <div class="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6 pe-2">
          <h2
            id="filters-heading"
            class="sr-only"
          >
            Filters
          </h2>
          <CatalogFilterPanel
            :filters="filters"
            :facets="data.facets"
            @update="onUpdate"
          />
        </div>
      </aside>

      <section
        id="results"
        class="scroll-mt-20"
        aria-labelledby="results-heading"
      >
        <h2
          id="results-heading"
          class="sr-only"
        >
          Products
        </h2>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CatalogSearchInput
            :model-value="filters.q"
            @commit="(q, opts) => update({ q }, opts)"
          />
          <div class="flex gap-2">
            <UButton
              class="lg:hidden"
              icon="i-lucide-sliders-horizontal"
              color="neutral"
              variant="outline"
              size="lg"
              @click="openMobileFilters"
            >
              Filters
              <UBadge
                v-if="activeCount"
                :label="String(activeCount)"
                size="sm"
                class="rounded-full"
              />
            </UButton>
            <USelect
              :model-value="filters.sort"
              :items="sortItems"
              icon="i-lucide-arrow-up-down"
              size="lg"
              aria-label="Sort products"
              class="min-w-56 flex-1"
              @update:model-value="update({ sort: $event as SortOption })"
            />
          </div>
        </div>

        <div class="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2">
          <CatalogActiveFilters
            :filters="filters"
            :facets="data.facets"
            @update="onUpdate"
            @clear="clearRefinements"
          />
          <p
            class="ms-auto text-sm text-muted tabular-nums"
            aria-live="polite"
            data-testid="result-count"
          >
            {{ rangeLabel }}
          </p>
        </div>

        <div
          class="mt-4 transition-opacity"
          :class="pending ? 'opacity-50 delay-150' : 'opacity-100'"
          :aria-busy="pending"
        >
          <ul
            v-if="data.items.length"
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            data-testid="product-grid"
          >
            <li
              v-for="product in data.items"
              :key="product.id"
            >
              <CatalogProductCard
                :product="product"
                :show-category="filters.categories.length !== 1"
                :query="filters.q"
              />
            </li>
          </ul>

          <UEmpty
            v-else
            icon="i-lucide-search-x"
            title="No products match"
            :description="filters.q ? `Nothing found for '${filters.q}' with the current filters.` : 'Try widening the ranges or removing a filter.'"
            :actions="[
              ...(activeCount ? [{ label: 'Clear filters', color: 'neutral' as const, variant: 'outline' as const, onClick: () => clearRefinements() }] : []),
              ...(filters.q ? [{ label: 'Clear search', color: 'neutral' as const, variant: 'ghost' as const, onClick: () => update({ q: '' }) }] : []),
            ]"
            class="py-16"
          />
        </div>

        <UPagination
          v-if="data.pageCount > 1"
          :page="data.page"
          :total="data.total"
          :items-per-page="data.pageSize"
          :sibling-count="1"
          :to="pageLink"
          show-edges
          class="mt-8 flex justify-center"
        />
      </section>
    </div>

    <LazyCatalogMobileFilters
      v-if="data && mobileFiltersLoaded"
      v-model:open="filtersOpen"
      :filters="filters"
      :facets="data.facets"
      :total="data.total"
      :pending="pending"
      :active-count="activeCount"
      @update="onUpdate"
      @clear="clearRefinements"
    />
  </UContainer>
</template>

<script setup lang="ts">
import { SORT_OPTIONS, type ProductFilters, type SortOption } from '#shared/utils/filters'

const { filters, query, update, clearRefinements, pageLink } = useProductFilters()

// refetches whenever the query changes
const { data, status, error, refresh } = await useFetch('/api/products', { query })

const pending = computed(() => status.value === 'pending')
const activeCount = computed(() => countActiveFilters(filters.value))
const filtersOpen = ref(false)
const mobileFiltersLoaded = ref(false)
function openMobileFilters() {
  mobileFiltersLoaded.value = true
  filtersOpen.value = true
}

function onUpdate(patch: Partial<ProductFilters>) {
  update(patch)
}

const sortItems = computed(() => {
  const specs = relevantSpecs(filters.value.categories)
  const options: SortOption[] = SORT_OPTIONS.filter((option) => {
    if (option.startsWith('capacity')) return specs.includes('capacity')
    if (option.startsWith('power')) return specs.includes('power')
    // €/kWh vs €/W can't be compared
    if (option === 'unit-price-asc') return specs.length === 1
    return true
  })
  if (!options.includes(filters.value.sort)) options.push(filters.value.sort)
  return options.map(value => ({
    value,
    label: value === 'relevance' && !filters.value.q ? 'Featured' : SORT_LABELS[value],
  }))
})

const manufacturerName = (slug: string) => data.value?.facets.manufacturers.find(m => m.value === slug)?.label ?? slug

const seo = computed(() => buildListingSeo(filters.value, {
  total: data.value?.total ?? 0,
  manufacturerNames: filters.value.manufacturers.map(manufacturerName),
  priceFrom: data.value?.priceRange?.min ?? null,
}))

const config = useRuntimeConfig()
const origin = config.public.siteUrl || useRequestURL().origin
const canonicalQuery = computed(() => serializeFilters({ ...filters.value, page: data.value?.page ?? filters.value.page }))
const canonical = computed(() => origin + toPath(canonicalQuery.value))

const crumbs = computed(() => buildBreadcrumbs(filters.value, manufacturerName))
const breadcrumbItems = computed(() => crumbs.value.map(crumb => ({
  label: crumb.label,
  to: isSameQuery(crumb.query, canonicalQuery.value) ? undefined : toPath(crumb.query),
})))

useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,
  robots: () => (seo.value.indexable ? 'index, follow' : 'noindex, follow'),
  ogTitle: () => seo.value.title,
  ogDescription: () => seo.value.description,
  ogUrl: () => canonical.value,
  ogType: 'website',
  ogSiteName: 'sun.store',
  twitterCard: 'summary',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  // JSON-LD only on indexable pages
  script: () => seo.value.indexable
    ? [{
        key: 'ld-listing',
        type: 'application/ld+json',
        innerHTML: serializeJsonLd(buildListingJsonLd({
          origin,
          query: canonicalQuery.value,
          name: seo.value.heading,
          description: seo.value.description,
          crumbs: crumbs.value,
        })),
      }]
    : [],
})

const rangeLabel = computed(() => {
  if (!data.value?.total) return '0 products'
  const { page, pageSize, total } = data.value
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return total <= pageSize ? `${total} ${total === 1 ? 'product' : 'products'}` : `${from}–${to} of ${total} products`
})

watch(() => filters.value.page, () => {
  const results = document.getElementById('results')
  if (results && results.getBoundingClientRect().top < 0) results.scrollIntoView({ block: 'start' })
})
</script>
