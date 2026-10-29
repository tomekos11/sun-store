import type { LocationQuery } from 'vue-router'
import type { ProductFilters } from '#shared/utils/filters'

export interface UpdateOptions {
  replace?: boolean
}

function sameQuery(a: Record<string, string>, b: LocationQuery): boolean {
  const keys = Object.keys(b).filter(k => b[k] !== undefined)
  return keys.length === Object.keys(a).length && keys.every(k => a[k] === b[k])
}

// Filter state lives only in the URL. Every change is a router navigation,
// so SSR and the back button work without extra code.
export function useProductFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed(() => parseFilters(route.query))
  const query = computed(() => serializeFilters(filters.value))

  // changing a filter goes back to page 1
  function update(patch: Partial<ProductFilters>, options: UpdateOptions = {}) {
    const next = serializeFilters({ ...filters.value, page: 1, ...patch })
    if (sameQuery(next, route.query)) return Promise.resolve()
    return options.replace ? router.replace({ query: next }) : router.push({ query: next })
  }

  // keeps search and sort
  function clearRefinements() {
    const { q, sort } = filters.value
    return update({ ...emptyFilters(), q, sort })
  }

  function pageLink(page: number) {
    return { query: serializeFilters({ ...filters.value, page }) }
  }

  return { filters, query, update, clearRefinements, pageLink }
}
