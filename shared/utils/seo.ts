import { DEFAULT_SORT, SPEC_META, categoryLabel, hasRange, type ProductFilters } from './filters'
import { formatNumber, formatPrice, formatRange } from './format'

export interface ListingSeoContext {
  total: number
  manufacturerNames: string[]
  priceFrom: number | null
}

export interface ListingSeo {
  heading: string
  title: string
  description: string
  // only category / category+manufacturer pages, everything else gets noindex
  indexable: boolean
}

const SITE_NAME = 'sun.store'

function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(' & ') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
}

function subject(filters: ProductFilters): string {
  const labels = filters.categories.map(categoryLabel)
  if (labels.length === 1 || labels.length === 2) return joinNames(labels)
  return 'Solar equipment'
}

export function buildListingSeo(filters: ProductFilters, ctx: ListingSeoContext): ListingSeo {
  const base = subject(filters)
  const brands = ctx.manufacturerNames
  const lowerBase = base.charAt(0).toLowerCase() + base.slice(1)

  let heading = base
  if (brands.length === 1 || brands.length === 2) heading = `${joinNames(brands)} ${lowerBase}`
  else if (brands.length > 2) heading = `${base} from ${brands.length} brands`

  const qualifiers = [
    formatRange(filters.capacity, formatNumber, ` ${SPEC_META.capacity.unit}`),
    formatRange(filters.power, formatNumber, ` ${SPEC_META.power.unit}`),
    formatRange(filters.price, formatPrice),
  ].filter((q): q is string => q !== null)
  if (qualifiers.length) heading += `, ${qualifiers.join(', ')}`

  let title = filters.q ? `"${filters.q}" in ${lowerBase}` : heading
  if (filters.q && qualifiers.length) title += `, ${qualifiers.join(', ')}`
  if (filters.page > 1) title += `, page ${filters.page}`
  title += ` | ${SITE_NAME}`

  const count = ctx.total === 1 ? '1 product' : `${ctx.total} products`
  const from = ctx.priceFrom !== null ? ` from ${formatPrice(ctx.priceFrom)}` : ''
  const description = ctx.total
    ? `${count}${from}: ${heading}${filters.q ? ` matching "${filters.q}"` : ''}. Compare specs, prices and price per kWh / W on ${SITE_NAME}, the B2B marketplace for PV installers and distributors.`
    : `No products match ${heading}${filters.q ? ` and "${filters.q}"` : ''}. Browse the full catalog of batteries, solar panels and connectors on ${SITE_NAME}.`

  const indexable = ctx.total > 0
    && !filters.q
    && filters.sort === DEFAULT_SORT
    && filters.categories.length <= 1
    && filters.manufacturers.length <= 1
    && !hasRange(filters.price)
    && !hasRange(filters.capacity)
    && !hasRange(filters.power)

  return { heading, title, description, indexable }
}
