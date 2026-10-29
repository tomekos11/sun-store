import type { NumericRange, SpecKind } from '../types/catalog'

// Used both by the page (route.query) and by the API (getQuery), so the URL
// and the API share one format. Invalid params are ignored, not rejected.

export const PAGE_SIZE = 24

export const SORT_OPTIONS = [
  'relevance',
  'price-asc',
  'price-desc',
  'unit-price-asc',
  'capacity-desc',
  'capacity-asc',
  'power-desc',
  'power-asc',
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]

export const DEFAULT_SORT: SortOption = 'relevance'

export interface ProductFilters {
  q: string
  categories: string[]
  manufacturers: string[]
  price: NumericRange
  capacity: NumericRange
  power: NumericRange
  sort: SortOption
  page: number
}

export type RangeFilterKey = 'price' | 'capacity' | 'power'

interface CategoryMeta {
  label: string
  singular: string
  spec: SpecKind | null
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  'battery': { label: 'Batteries', singular: 'Battery', spec: 'capacity' },
  'solar-panel': { label: 'Solar panels', singular: 'Solar panel', spec: 'power' },
  'connector': { label: 'Connectors & accessories', singular: 'Connector', spec: null },
}

export const SPEC_META: Record<SpecKind, { label: string, unit: 'kWh' | 'W', step: number }> = {
  capacity: { label: 'Capacity', unit: 'kWh', step: 0.5 },
  power: { label: 'Power', unit: 'W', step: 5 },
}

export function categoryLabel(slug: string): string {
  return CATEGORY_META[slug]?.label ?? titleCase(slug.replace(/-/g, ' '))
}

export function categorySpec(slug: string): SpecKind | null {
  return CATEGORY_META[slug]?.spec ?? null
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, c => c.toUpperCase())
}

export function emptyFilters(): ProductFilters {
  return {
    q: '',
    categories: [],
    manufacturers: [],
    price: { min: null, max: null },
    capacity: { min: null, max: null },
    power: { min: null, max: null },
    sort: DEFAULT_SORT,
    page: 1,
  }
}

type QueryValue = string | null | undefined | (string | null)[]
type QueryInput = Record<string, QueryValue | unknown>

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RANGE_RE = /^(\d+(?:\.\d+)?)?-(\d+(?:\.\d+)?)?$/
const MAX_QUERY_LENGTH = 100

function first(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : undefined
}

// accepts both ?category=a,b and ?category=a&category=b
function list(value: unknown): string[] {
  const raw = (Array.isArray(value) ? value : [value])
    .filter((v): v is string => typeof v === 'string')
    .flatMap(v => v.split(','))
    .map(v => v.trim().toLowerCase())
    .filter(v => SLUG_RE.test(v))
  // sorted so the same filters always give the same URL
  return [...new Set(raw)].sort()
}

export function parseRange(value: unknown): NumericRange {
  const raw = first(value)?.trim()
  const match = raw ? RANGE_RE.exec(raw) : null
  if (!match) return { min: null, max: null }
  let min = match[1] !== undefined ? Number(match[1]) : null
  let max = match[2] !== undefined ? Number(match[2]) : null
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  return { min, max }
}

export function parseFilters(query: QueryInput): ProductFilters {
  const sort = first(query.sort)
  const page = Number.parseInt(first(query.page) ?? '', 10)

  return {
    q: (first(query.q) ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH),
    categories: list(query.category),
    manufacturers: list(query.manufacturer),
    price: parseRange(query.price),
    capacity: parseRange(query.capacity),
    power: parseRange(query.power),
    sort: SORT_OPTIONS.includes(sort as SortOption) ? (sort as SortOption) : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

function formatNumber(n: number): string {
  // slider steps can produce things like 0.30000000000000004
  return String(Math.round(n * 1000) / 1000)
}

export function serializeRange(range: NumericRange): string | undefined {
  if (range.min === null && range.max === null) return undefined
  return `${range.min === null ? '' : formatNumber(range.min)}-${range.max === null ? '' : formatNumber(range.max)}`
}

// Inverse of parseFilters. Skips default values.
export function serializeFilters(filters: ProductFilters): Record<string, string> {
  const query: Record<string, string> = {}
  if (filters.q) query.q = filters.q
  if (filters.categories.length) query.category = [...filters.categories].sort().join(',')
  if (filters.manufacturers.length) query.manufacturer = [...filters.manufacturers].sort().join(',')

  for (const key of ['price', 'capacity', 'power'] as const) {
    const value = serializeRange(filters[key])
    if (value) query[key] = value
  }

  if (filters.sort !== DEFAULT_SORT) query.sort = filters.sort
  if (filters.page > 1) query.page = String(filters.page)
  return query
}

export function hasRange(range: NumericRange): boolean {
  return range.min !== null || range.max !== null
}

export function countActiveFilters(filters: ProductFilters): number {
  return filters.categories.length
    + filters.manufacturers.length
    + Number(hasRange(filters.price))
    + Number(hasRange(filters.capacity))
    + Number(hasRange(filters.power))
}

// e.g. no capacity filter when only solar panels are selected
export function relevantSpecs(categories: string[]): SpecKind[] {
  if (!categories.length) return ['capacity', 'power']
  return (['capacity', 'power'] as const).filter(kind => categories.some(c => categorySpec(c) === kind))
}
