import { emptyFilters, serializeFilters } from '#shared/utils/filters'
import type { CatalogEntry } from './catalog'

// Pages for the sitemap. Must match buildListingSeo().indexable (covered by a test).
export function landingPages(entries: CatalogEntry[]): Record<string, string>[] {
  const pairs = new Map<string, Set<string>>()
  for (const { product } of entries) {
    const brands = pairs.get(product.category) ?? new Set<string>()
    brands.add(product.manufacturerSlug)
    pairs.set(product.category, brands)
  }

  const pages: Record<string, string>[] = [{}]
  for (const [category, brands] of pairs) {
    pages.push(serializeFilters({ ...emptyFilters(), categories: [category] }))
    for (const manufacturer of [...brands].sort()) {
      pages.push(serializeFilters({ ...emptyFilters(), categories: [category], manufacturers: [manufacturer] }))
    }
  }
  return pages
}
