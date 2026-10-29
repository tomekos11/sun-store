import type { Bounds, FacetOption, NumericRange, Product, ProductListResponse } from '#shared/types/catalog'
import { CATEGORY_META, PAGE_SIZE, categoryLabel, hasRange, type ProductFilters } from '#shared/utils/filters'
import MiniSearch, { type Query } from 'minisearch'
import type { Catalog, CatalogEntry } from './catalog'

const SYNONYMS = [['lfp', 'lifepo4'], ['panel', 'module']]

// lowercase, no diacritics, naive singular (batteries -> battery), same for index and query
export function processTerm(term: string): string | null {
  const t = term.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (!t) return null
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1)
  return t
}

export function createSearchIndex(entries: CatalogEntry[]): MiniSearch {
  const index = new MiniSearch({
    idField: 'index',
    fields: ['name', 'manufacturer', 'description'],
    extractField: (entry, field) => field === 'index' ? entry.index : entry.product[field],
    processTerm,
    searchOptions: {
      combineWith: 'AND',
      boost: { name: 3, manufacturer: 2 },
      prefix: true,
      // fuzzy only for longer words, otherwise "homev" also matches "homeb..."
      fuzzy: term => (term.length >= 6 ? 0.2 : false),
    },
  })
  index.addAll(entries)
  return index
}

// every word has to match, synonyms are OR-ed: "lfp battery" -> (lfp OR lifepo4) AND battery
export function buildQuery(q: string): Query | null {
  const tokenize = MiniSearch.getDefault('tokenize') as (text: string) => string[]
  const terms = [...new Set(tokenize(q).map(processTerm).filter((t): t is string => !!t))]
  if (!terms.length) return null
  return {
    combineWith: 'AND',
    queries: terms.map((term) => {
      const group = SYNONYMS.find(g => g.includes(term))
      return group ? { combineWith: 'OR', queries: group } : term
    }),
  }
}

type FacetKey = 'category' | 'manufacturer' | 'price' | 'capacity' | 'power'

function inRange(value: number | null, range: NumericRange): boolean {
  if (!hasRange(range)) return true
  // a kWh range filters out products without capacity
  if (value === null) return false
  return (range.min === null || value >= range.min) && (range.max === null || value <= range.max)
}

// `except` skips one facet, so its counts ignore its own selection (OR within a facet)
function passes(product: Product, f: ProductFilters, except?: FacetKey): boolean {
  return (except === 'category' || !f.categories.length || f.categories.includes(product.category))
    && (except === 'manufacturer' || !f.manufacturers.length || f.manufacturers.includes(product.manufacturerSlug))
    && (except === 'price' || inRange(product.price, f.price))
    && (except === 'capacity' || inRange(product.specs.capacityKwh, f.capacity))
    && (except === 'power' || inRange(product.specs.powerW, f.power))
}

function bounds(values: (number | null)[]): Bounds | null {
  const nums = values.filter((v): v is number => v !== null)
  if (!nums.length) return null
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

function countBy(
  entries: CatalogEntry[],
  key: (p: Product) => string,
  label: (p: Product) => string,
  selected: string[],
  seed: CatalogEntry[] = [],
): FacetOption[] {
  const map = new Map<string, FacetOption>()
  for (const { product } of seed) {
    if (!map.has(key(product))) map.set(key(product), { value: key(product), label: label(product), count: 0 })
  }
  for (const { product } of entries) {
    const value = key(product)
    const option = map.get(value) ?? { value, label: label(product), count: 0 }
    option.count++
    map.set(value, option)
  }
  // keep selected options, otherwise they couldn't be unchecked
  for (const value of selected) {
    if (!map.has(value)) map.set(value, { value, label: value, count: 0 })
  }
  return [...map.values()]
}

const categoryOrder = Object.keys(CATEGORY_META)

function compareNullable(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === b) return 0
  if (a === null) return 1 // nulls last
  if (b === null) return -1
  return (a - b) * dir
}

type Scored = { entry: CatalogEntry, score: number }

function comparator(sort: ProductFilters['sort']): (a: Scored, b: Scored) => number {
  const p = (s: Scored) => s.entry.product
  const byIndex = (a: Scored, b: Scored) => a.entry.index - b.entry.index
  const by = (diff: (a: Scored, b: Scored) => number) => (a: Scored, b: Scored) => diff(a, b) || byIndex(a, b)

  switch (sort) {
    case 'price-asc': return by((a, b) => p(a).price - p(b).price)
    case 'price-desc': return by((a, b) => p(b).price - p(a).price)
    case 'unit-price-asc': return by((a, b) => compareNullable(p(a).unitPrice?.value ?? null, p(b).unitPrice?.value ?? null, 1))
    case 'capacity-asc': return by((a, b) => compareNullable(p(a).specs.capacityKwh, p(b).specs.capacityKwh, 1))
    case 'capacity-desc': return by((a, b) => compareNullable(p(a).specs.capacityKwh, p(b).specs.capacityKwh, -1))
    case 'power-asc': return by((a, b) => compareNullable(p(a).specs.powerW, p(b).specs.powerW, 1))
    case 'power-desc': return by((a, b) => compareNullable(p(a).specs.powerW, p(b).specs.powerW, -1))
    case 'relevance':
    default: return by((a, b) => b.score - a.score)
  }
}

export function queryCatalog({ entries, index }: Catalog, filters: ProductFilters, pageSize = PAGE_SIZE): ProductListResponse {
  // search first, facets are counted within the search results
  const query = buildQuery(filters.q)
  const scores = query ? new Map(index.search(query).map(r => [r.id as number, r.score])) : null
  const searched: Scored[] = entries
    .filter(entry => !scores || scores.has(entry.index))
    .map(entry => ({ entry, score: scores?.get(entry.index) ?? 0 }))
  const universe = searched.map(s => s.entry)
  const except = (key: FacetKey) => universe.filter(e => passes(e.product, filters, key))

  const matched = searched.filter(s => passes(s.entry.product, filters)).sort(comparator(filters.sort))

  const total = matched.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(filters.page, pageCount)
  const items = matched.slice((page - 1) * pageSize, page * pageSize).map(s => s.entry.product)

  const categories = countBy(except('category'), p => p.category, p => categoryLabel(p.category), filters.categories, universe)
    .sort((a, b) => (categoryOrder.indexOf(a.value) + 1 || Infinity) - (categoryOrder.indexOf(b.value) + 1 || Infinity) || a.label.localeCompare(b.label))
  const manufacturers = countBy(except('manufacturer'), p => p.manufacturerSlug, p => p.manufacturer, filters.manufacturers)
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
    priceRange: bounds(matched.map(s => s.entry.product.price)),
    facets: {
      categories,
      manufacturers,
      price: bounds(except('price').map(e => e.product.price)),
      capacity: bounds(except('capacity').map(e => e.product.specs.capacityKwh)),
      power: bounds(except('power').map(e => e.product.specs.powerW)),
    },
  }
}
