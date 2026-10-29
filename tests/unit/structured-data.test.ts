import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { highlight } from '../../app/utils/highlight'
import { buildCatalog } from '../../server/lib/catalog'
import { landingPages } from '../../server/lib/landing-pages'
import { queryCatalog } from '../../server/lib/search'
import { parseFilters } from '../../shared/utils/filters'
import { buildListingSeo } from '../../shared/utils/seo'
import { buildBreadcrumbs, buildListingJsonLd, serializeJsonLd, toPath } from '../../shared/utils/structured-data'

const names: Record<string, string> = { ecocharge: 'EcoCharge' }
const crumbsFor = (query: Record<string, string>) => buildBreadcrumbs(parseFilters(query), slug => names[slug] ?? slug)

describe('breadcrumbs', () => {
  it('follows category → manufacturer', () => {
    expect(crumbsFor({ category: 'battery', manufacturer: 'ecocharge' }).map(c => c.label)).toEqual(['All products', 'Batteries', 'EcoCharge'])
  })

  it('ignores multi-selections and other refinements', () => {
    expect(crumbsFor({ category: 'battery,connector', price: '1-', q: 'x' }).map(c => c.label)).toEqual(['All products'])
  })
})

describe('JSON-LD', () => {
  const query = { category: 'battery', manufacturer: 'ecocharge' }
  const ld = buildListingJsonLd({ origin: 'https://example.com', query, name: 'EcoCharge batteries', description: 'd', crumbs: crumbsFor(query) })
  const graph = ld['@graph'] as Record<string, unknown>[]

  it('emits WebSite, CollectionPage and BreadcrumbList, no Product', () => {
    expect(graph.map(n => n['@type'])).toEqual(['WebSite', 'CollectionPage', 'BreadcrumbList'])
    expect(JSON.stringify(ld)).not.toContain('"Product"')
  })

  it('links every crumb except the current page', () => {
    const items = (graph[2] as { itemListElement: Record<string, unknown>[] }).itemListElement
    expect(items).toEqual([
      { '@type': 'ListItem', 'position': 1, 'name': 'All products', 'item': 'https://example.com/' },
      { '@type': 'ListItem', 'position': 2, 'name': 'Batteries', 'item': 'https://example.com/?category=battery' },
      { '@type': 'ListItem', 'position': 3, 'name': 'EcoCharge' },
    ])
  })

  it('skips the BreadcrumbList when there is no trail', () => {
    const home = buildListingJsonLd({ origin: 'https://example.com', query: {}, name: 'All', description: 'd', crumbs: crumbsFor({}) })
    expect((home['@graph'] as Record<string, unknown>[]).map(n => n['@type'])).toEqual(['WebSite', 'CollectionPage'])
  })

  it('cannot break out of the <script> tag', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})

describe('sitemap landing pages', () => {
  const csv = readFileSync(new URL('../../server/assets/products.csv', import.meta.url), 'utf8')
  const catalog = buildCatalog(csv)
  const { entries } = catalog
  const pages = landingPages(entries)

  it('lists home, every category and every category + manufacturer pair', () => {
    expect(pages[0]).toEqual({})
    expect(pages).toContainEqual({ category: 'solar-panel' })
    expect(pages).toContainEqual({ category: 'battery', manufacturer: 'ecocharge' })
    expect(pages).toHaveLength(1 + 3 + 27)
    expect(new Set(pages.map(toPath)).size).toBe(pages.length)
  })

  it('contains only pages that are indexable and non-empty (never a noindex URL)', () => {
    for (const query of pages) {
      const filters = parseFilters(query)
      const result = queryCatalog(catalog, filters)
      const seo = buildListingSeo(filters, { total: result.total, manufacturerNames: [], priceFrom: null })
      expect(seo.indexable, toPath(query)).toBe(true)
    }
  })
})

describe('highlight', () => {
  const marked = (text: string, q: string) => highlight(text, q).map(p => (p.match ? `[${p.text}]` : p.text)).join('')

  it('marks every occurrence, case-insensitively, without changing the text', () => {
    expect(marked('The HomeVault 10, homevault backup', 'homevault')).toBe('The [HomeVault] 10, [homevault] backup')
  })

  it('prefers the longest word at the same position', () => {
    expect(marked('HomeVault', 'home homevault')).toBe('[HomeVault]')
  })

  it('treats regex characters literally and ignores 1-char noise', () => {
    expect(marked('Q.Peak (400)', 'q.peak ( a')).toBe('[Q.Peak] (400)')
  })

  it('returns the text untouched without a query', () => {
    expect(highlight('abc', '')).toEqual([{ text: 'abc', match: false }])
  })
})
