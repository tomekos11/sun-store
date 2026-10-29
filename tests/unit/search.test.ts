import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../../server/lib/catalog'
import { buildQuery, processTerm, queryCatalog } from '../../server/lib/search'
import { parseFilters } from '../../shared/utils/filters'

const csv = readFileSync(new URL('../../server/assets/products.csv', import.meta.url), 'utf8')
const catalog = buildCatalog(csv)
const { entries } = catalog
const run = (query: Record<string, string>, pageSize = 500) => queryCatalog(catalog, parseFilters(query), pageSize)
const names = (query: Record<string, string>) => run(query).items.map(p => p.name)

describe('query building', () => {
  it('normalizes terms', () => {
    expect(processTerm('Énergie')).toBe('energie')
    expect(processTerm('Batteries')).toBe('battery')
    expect(processTerm('panels')).toBe('panel')
    expect(processTerm('glass')).toBe('glass')
  })

  it('ANDs words, ORs synonyms and dedupes', () => {
    expect(buildQuery('LFP battery lfp')).toEqual({
      combineWith: 'AND',
      queries: [{ combineWith: 'OR', queries: ['lfp', 'lifepo4'] }, 'battery'],
    })
    expect(buildQuery('  !!  ')).toBeNull()
  })
})

describe('filtering', () => {
  it('filters by category', () => {
    const r = run({ category: 'battery' })
    expect(r.total).toBe(50)
    expect(r.items.every(p => p.category === 'battery')).toBe(true)
  })

  it('combines values within a facet with OR and across facets with AND', () => {
    const r = run({ category: 'battery', manufacturer: 'ecocharge,aurapower' })
    expect(r.total).toBe(10)
    expect(new Set(r.items.map(p => p.manufacturer))).toEqual(new Set(['EcoCharge', 'AuraPower']))
  })

  it('filters by an inclusive price range', () => {
    const r = run({ price: '1499-1500' })
    expect(r.items.map(p => p.price).sort()).toEqual([1499, 1500])
  })

  it('filters by capacity and excludes products without capacity', () => {
    const r = run({ capacity: '10-12' })
    expect(r.total).toBeGreaterThan(0)
    for (const p of r.items) {
      expect(p.category).toBe('battery')
      expect(p.specs.capacityKwh).toBeGreaterThanOrEqual(10)
      expect(p.specs.capacityKwh).toBeLessThanOrEqual(12)
    }
  })

  it('filters by power with an open range', () => {
    const r = run({ power: '580-' })
    expect(r.items.map(p => p.specs.powerW).sort()).toEqual([580, 590, 600])
  })
})

describe('search', () => {
  it('searches name, manufacturer and description', () => {
    expect(names({ q: 'homevault' })).toHaveLength(5) // name
    expect(names({ q: 'zenithstorage' })).toHaveLength(5) // manufacturer
    expect(names({ q: 'salt mist' })).toEqual(expect.arrayContaining(['FusionPV Flex 310', 'Solarix Prime 425'])) // description
  })

  it('requires every word to match', () => {
    const r = run({ q: 'bifacial dual-glass' }).items
    expect(r.length).toBeGreaterThan(0)
    expect(r.every(p => /bifacial/i.test(p.name + p.description) && /dual-glass/i.test(p.description))).toBe(true)
  })

  it('ranks name matches above description matches', () => {
    expect(names({ q: 'homevault 10' })[0]).toBe('EcoCharge HomeVault 10')
    expect(names({ q: 'stack' }).slice(0, 4).every(n => n.startsWith('PowerFlow Stack'))).toBe(true)
    expect(names({ q: 'stack' }).length).toBeGreaterThan(4)
  })

  it('treats LFP and LiFePO4 as synonyms', () => {
    const items = run({ q: 'lfp' }).items
    expect(items.some(p => !/lfp/i.test(p.description) && /lifepo4/i.test(p.description))).toBe(true)
  })

  it('tolerates typos and matches prefixes', () => {
    expect(names({ q: 'homevalt' })).toHaveLength(5)
    expect(names({ q: 'homev' })).toHaveLength(5)
  })

  it('matches plurals to singular forms', () => {
    expect(run({ q: 'connectors' }).total).toBe(run({ q: 'connector' }).total)
  })

  it('is case and accent insensitive', () => {
    expect(run({ q: 'ÉCOCHARGE' }).total).toBe(5)
  })

  it('returns nothing for a nonsense query', () => {
    expect(run({ q: 'zzzzqx' }).total).toBe(0)
  })
})

describe('sorting', () => {
  it('sorts by capacity descending with products lacking capacity last', () => {
    const caps = run({ sort: 'capacity-desc' }).items.map(p => p.specs.capacityKwh)
    const firstNull = caps.indexOf(null)
    expect(firstNull).toBe(50)
    expect(caps.slice(firstNull).every(c => c === null)).toBe(true)
    const known = caps.slice(0, firstNull) as number[]
    expect(known).toEqual([...known].sort((a, b) => b - a))
  })

  it('sorts by power ascending', () => {
    const powers = run({ category: 'solar-panel', sort: 'power-asc' }).items.map(p => p.specs.powerW ?? 0)
    expect(powers).toEqual([...powers].sort((a, b) => a - b))
  })

  it('sorts by price per kWh', () => {
    const values = run({ category: 'battery', sort: 'unit-price-asc' }).items.map(p => p.unitPrice?.value ?? 0)
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  it('is stable: ties keep the source order', () => {
    const tenKwh = run({ category: 'battery', sort: 'capacity-desc' }).items.filter(p => p.specs.capacityKwh === 10)
    const sourceOrder = entries.filter(e => e.product.specs.capacityKwh === 10).map(e => e.product.name)
    expect(tenKwh.map(p => p.name)).toEqual(sourceOrder)
  })
})

describe('facets (disjunctive)', () => {
  it('counts manufacturers ignoring the manufacturer selection itself', () => {
    const r = run({ category: 'battery', manufacturer: 'ecocharge' })
    expect(r.total).toBe(5)
    expect(r.facets.manufacturers).toHaveLength(10)
    expect(r.facets.manufacturers.every(m => m.count === 5)).toBe(true)
  })

  it('counts categories within the search results', () => {
    expect(run({ q: 'mc4' }).facets.categories.map(c => c.value)).toEqual(['connector'])
  })

  it('keeps a selected option visible even with zero results', () => {
    const r = run({ category: 'connector', manufacturer: 'ecocharge' })
    expect(r.total).toBe(0)
    expect(r.facets.manufacturers.find(m => m.value === 'ecocharge')).toMatchObject({ count: 0 })
  })

  it('computes range bounds without the own range filter', () => {
    const r = run({ category: 'battery', capacity: '14-' })
    expect(r.facets.capacity).toEqual({ min: 2.4, max: 15 })
    expect(r.priceRange?.min).toBeGreaterThanOrEqual(1850)
    expect(r.facets.price).toEqual(r.priceRange)
  })
})

describe('pagination', () => {
  it('slices pages and clamps an out-of-range page', () => {
    const first = queryCatalog(catalog, parseFilters({}), 24)
    expect(first).toMatchObject({ total: 150, pageCount: 7, page: 1 })
    expect(first.items).toHaveLength(24)
    const last = queryCatalog(catalog, parseFilters({ page: '99' }), 24)
    expect(last.page).toBe(7)
    expect(last.items).toHaveLength(6)
  })
})
