import { categoryLabel, type ProductFilters } from './filters'

// No Product markup here on purpose: Google supports product rich results only
// on single-product pages. See README.

export interface Crumb {
  label: string
  query: Record<string, string>
}

// All products > category > manufacturer, only for single selections
export function buildBreadcrumbs(filters: ProductFilters, manufacturerName: (slug: string) => string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'All products', query: {} }]
  const category = filters.categories.length === 1 ? filters.categories[0] : undefined
  if (category) crumbs.push({ label: categoryLabel(category), query: { category } })

  const manufacturer = filters.manufacturers.length === 1 ? filters.manufacturers[0] : undefined
  if (manufacturer) {
    crumbs.push({
      label: manufacturerName(manufacturer),
      query: category ? { category, manufacturer } : { manufacturer },
    })
  }
  return crumbs
}

export function toPath(query: Record<string, string>): string {
  const search = Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ',')}`)
    .join('&')
  return `/${search ? `?${search}` : ''}`
}

export function isSameQuery(a: Record<string, string>, b: Record<string, string>): boolean {
  return toPath(a) === toPath(b)
}

interface JsonLdInput {
  origin: string
  query: Record<string, string>
  name: string
  description: string
  crumbs: Crumb[]
}

export function buildListingJsonLd({ origin, query, name, description, crumbs }: JsonLdInput) {
  const url = origin + toPath(query)
  const website = { '@type': 'WebSite', '@id': `${origin}/#website`, 'name': 'sun.store', 'url': `${origin}/` }
  const hasTrail = crumbs.length >= 2

  const page = {
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    'inLanguage': 'en',
    'isPartOf': { '@id': website['@id'] },
    ...(hasTrail ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
  }

  const breadcrumb = hasTrail
    ? {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        'itemListElement': crumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'name': crumb.label,
          // last crumb (current page) doesn't need a url
          ...(isSameQuery(crumb.query, query) ? {} : { item: origin + toPath(crumb.query) }),
        })),
      }
    : null

  return {
    '@context': 'https://schema.org',
    '@graph': [website, page, ...(breadcrumb ? [breadcrumb] : [])],
  }
}

// escape < so the content can't close the <script> tag
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
