import { describe, expect, it } from 'vitest'
import { parseFilters } from '../../shared/utils/filters'
import { buildListingSeo, type ListingSeoContext } from '../../shared/utils/seo'

const ctx: ListingSeoContext = { total: 12, manufacturerNames: [], priceFrom: 299.99 }
const seo = (query: Record<string, string>, extra: Partial<ListingSeoContext> = {}) =>
  buildListingSeo(parseFilters(query), { ...ctx, ...extra })

describe('buildListingSeo', () => {
  it('describes the unfiltered listing', () => {
    expect(seo({})).toMatchObject({ heading: 'Solar equipment', title: 'Solar equipment | sun.store', indexable: true })
    expect(seo({}).description).toContain('12 products from €299.99')
  })

  it('uses category and brand in heading and title', () => {
    expect(seo({ category: 'battery', manufacturer: 'ecocharge' }, { manufacturerNames: ['EcoCharge'] }))
      .toMatchObject({ heading: 'EcoCharge batteries', title: 'EcoCharge batteries | sun.store', indexable: true })
  })

  it('adds spec and price qualifiers', () => {
    expect(seo({ category: 'battery', capacity: '5-10', price: '-1500' }).heading).toBe('Batteries, 5–10 kWh, up to €1,500')
    expect(seo({ category: 'solar-panel', power: '400-' }).heading).toBe('Solar panels, from 400 W')
  })

  it('summarises many brands', () => {
    expect(seo({ manufacturer: 'a,b,c' }, { manufacturerNames: ['A', 'B', 'C'] }).heading).toBe('Solar equipment from 3 brands')
  })

  it('reflects search and pagination in the title', () => {
    expect(seo({ q: 'lfp', category: 'battery', page: '2' }).title).toBe('"lfp" in batteries, page 2 | sun.store')
  })

  it.each([
    { q: 'lfp' },
    { sort: 'price-asc' },
    { price: '100-200' },
    { capacity: '5-' },
    { category: 'battery,solar-panel' },
    { manufacturer: 'a,b' },
  ])('does not index long-tail combination %o', (query) => {
    expect(seo(query).indexable).toBe(false)
  })

  it('indexes paginated landing pages', () => {
    expect(seo({ category: 'battery', page: '2' }).indexable).toBe(true)
  })

  it('does not index empty results', () => {
    const empty = seo({ category: 'battery' }, { total: 0, priceFrom: null })
    expect(empty.indexable).toBe(false)
    expect(empty.description).toMatch(/^No products match/)
  })
})
