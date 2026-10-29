import { describe, expect, it } from 'vitest'
import { QUERY_KEYS, countActiveFilters, emptyFilters, parseFilters, relevantSpecs, serializeFilters } from '../../shared/utils/filters'

describe('parseFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(parseFilters({})).toEqual(emptyFilters())
  })

  it('parses every supported param', () => {
    expect(parseFilters({
      q: '  lfp   battery ',
      category: 'battery',
      manufacturer: 'ecocharge,auraPower',
      price: '100-1500',
      capacity: '5-',
      power: '-450',
      sort: 'price-desc',
      page: '2',
    })).toEqual({
      q: 'lfp battery',
      categories: ['battery'],
      manufacturers: ['aurapower', 'ecocharge'],
      price: { min: 100, max: 1500 },
      capacity: { min: 5, max: null },
      power: { min: null, max: 450 },
      sort: 'price-desc',
      page: 2,
    })
  })

  it('accepts repeated params and dedupes them', () => {
    expect(parseFilters({ category: ['solar-panel', 'battery,solar-panel'] }).categories).toEqual(['battery', 'solar-panel'])
  })

  it('ignores garbage instead of failing', () => {
    const f = parseFilters({
      category: '<script>',
      price: 'abc',
      capacity: '5-10-15',
      sort: 'cheapest',
      page: '-3',
      q: ['first', 'second'],
    })
    expect(f).toEqual({ ...emptyFilters(), q: 'first' })
  })

  it('swaps an inverted range', () => {
    expect(parseFilters({ price: '500-100' }).price).toEqual({ min: 100, max: 500 })
  })

  it('caps the search length', () => {
    expect(parseFilters({ q: 'x'.repeat(500) }).q).toHaveLength(100)
  })
})

describe('serializeFilters', () => {
  it('omits defaults', () => {
    expect(serializeFilters(emptyFilters())).toEqual({})
  })

  it('round-trips through parseFilters', () => {
    const query = { q: 'vault', category: 'battery', manufacturer: 'aurapower,ecocharge', price: '100-1500.5', capacity: '-12', sort: 'capacity-desc', page: '3' }
    expect(serializeFilters(parseFilters(query))).toEqual(query)
  })

  it('produces the same URL regardless of input order (canonical)', () => {
    const a = serializeFilters(parseFilters({ manufacturer: 'b,a', category: 'solar-panel,battery' }))
    const b = serializeFilters(parseFilters({ category: 'battery,solar-panel', manufacturer: 'a,b' }))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('only produces keys listed in QUERY_KEYS (used as the CDN cache key)', () => {
    const all = parseFilters({ q: 'x', category: 'battery', manufacturer: 'a', price: '1-2', capacity: '1-2', power: '1-2', sort: 'price-asc', page: '2' })
    expect(Object.keys(serializeFilters(all))).toEqual(QUERY_KEYS)
  })

  it('cleans floating point noise from slider steps', () => {
    expect(serializeFilters({ ...emptyFilters(), capacity: { min: 0.1 + 0.2, max: null } }).capacity).toBe('0.3-')
  })
})

describe('helpers', () => {
  it('counts active refinements, not search or sort', () => {
    expect(countActiveFilters(parseFilters({ q: 'x', sort: 'price-asc', category: 'battery,connector', price: '1-' }))).toBe(3)
  })

  it('knows which spec filters apply to a category selection', () => {
    expect(relevantSpecs([])).toEqual(['capacity', 'power'])
    expect(relevantSpecs(['battery'])).toEqual(['capacity'])
    expect(relevantSpecs(['battery', 'solar-panel'])).toEqual(['capacity', 'power'])
    expect(relevantSpecs(['connector'])).toEqual([])
  })
})
