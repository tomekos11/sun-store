import { parseFilters } from '#shared/utils/filters'
import { queryCatalog } from '../lib/search'

// GET /api/products, same query params as the page URL (shared/utils/filters.ts)
export default defineEventHandler(async (event) => {
  const start = performance.now()
  const catalog = await useCatalog()
  const loaded = performance.now()

  const result = queryCatalog(catalog, parseFilters(getQuery(event)))

  setResponseHeader(event, 'server-timing', [
    `catalog;desc="load CSV";dur=${(loaded - start).toFixed(2)}`,
    `query;desc="filter+facets";dur=${(performance.now() - loaded).toFixed(2)}`,
  ].join(', '))
  return result
})
