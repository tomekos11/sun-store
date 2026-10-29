import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../../server/lib/catalog'
import { extractSpec, findSpecValues, modelNumber, parseLocaleNumber } from '../../server/lib/specs'

const product = (name: string, description: string) => ({ name, description })

describe('parseLocaleNumber', () => {
  it.each([
    ['7.5', 7.5],
    ['7,5', 7.5], // EU decimal comma
    ['6,000', 6000], // thousands separator
    ['450', 450],
  ])('%s -> %d', (raw, expected) => {
    expect(parseLocaleNumber(raw)).toBe(expected)
  })
})

describe('findSpecValues', () => {
  it('finds capacity with and without a space and normalises Wh to kWh', () => {
    expect(findSpecValues('capacity', 'A 10kWh unit, or 5 kWh, or 2500Wh')).toEqual([10, 5, 2.5])
  })

  it('is case-insensitive about the unit', () => {
    expect(findSpecValues('capacity', '13.5 KWH battery')).toEqual([13.5])
  })

  it('finds power in W, Wp and kW', () => {
    expect(findSpecValues('power', 'Rated 450W, 455 Wp peak, 0.46 kWp')).toEqual([450, 455, 460])
  })

  it('does not read energy, volts, amps or pascals as power', () => {
    expect(findSpecValues('power', 'a 10kWh battery, 1500V system, 15A fuse, 5400 Pa snow load, 2400 Pa wind')).toEqual([])
  })

  it('does not take digits out of longer tokens', () => {
    expect(findSpecValues('power', 'model X1450Wide')).toEqual([])
    expect(findSpecValues('capacity', 'LiFePO4 chemistry, 6,000 cycle life')).toEqual([])
  })

  it('drops implausible values', () => {
    expect(findSpecValues('power', 'a 5000W string inverter')).toEqual([])
  })
})

describe('modelNumber', () => {
  it.each([
    ['EcoCharge HomeVault 13.5', 13.5],
    ['Solarix Prime 450', 450],
    ['QuantumCell Q.Peak 400', 400],
    ['SafeLock Inline Fuse 15A', null], // unit-glued token
    ['PV-Link T-Branch 2-1', null], // ratio, not a size
    ['QuickLink MC3 Set (10-pack)', null],
  ])('%s -> %s', (name, expected) => {
    expect(modelNumber(name)).toBe(expected)
  })
})

describe('extractSpec', () => {
  it('prefers the description value that matches the model number', () => {
    expect(extractSpec('capacity', product(
      'PowerFlow Stack 7.5',
      'The PowerFlow Stack 7.5 is a 7.5kWh modular LFP battery. You can stack up to four units for a total of 30kWh.',
    ))).toEqual({ value: 7.5, source: 'name+description' })

    expect(extractSpec('capacity', product(
      'AuraPower Reserve 12.5',
      'A 12.5kWh (five 2.5kWh modules) stackable LFP system.',
    ))).toEqual({ value: 12.5, source: 'name+description' })
  })

  it('takes the first description value when the name has no model number', () => {
    expect(extractSpec('capacity', product('Home Battery', 'A 9kWh unit, expandable to 27kWh.')))
      .toEqual({ value: 9, source: 'description' })
  })

  it('trusts the description over a conflicting name', () => {
    expect(extractSpec('power', product('Acme Panel 400', 'This 405W monocrystalline panel'))).toEqual({ value: 405, source: 'description' })
  })

  it('falls back to the model number only when allowed', () => {
    const p = product('EcoCharge HomeVault 10', 'Whole-home backup battery.')
    expect(extractSpec('capacity', p)).toBeNull()
    expect(extractSpec('capacity', p, { nameFallback: true })).toEqual({ value: 10, source: 'name' })
  })

  it('rejects an implausible model number as a fallback', () => {
    expect(extractSpec('power', product('Panel 2024', 'No specs here'), { nameFallback: true })).toBeNull()
  })

  it('returns null when nothing is found', () => {
    expect(extractSpec('power', product('SafeLock Inline Fuse 15A', 'A 15A fuse for 1500V strings'), { nameFallback: true })).toBeNull()
  })
})

describe('real data (server/assets/products.csv)', () => {
  const csv = readFileSync(new URL('../../server/assets/products.csv', import.meta.url), 'utf8')
  const { entries, warnings } = buildCatalog(csv)
  const products = entries.map(e => e.product)

  it('loads all 150 products without warnings', () => {
    expect(products).toHaveLength(150)
    expect(warnings).toEqual([])
  })

  it('every battery has a capacity and every panel a power, confirmed by name and description', () => {
    for (const entry of entries) {
      const { category, specs } = entry.product
      if (category === 'battery') expect(specs.capacityKwh, entry.product.name).toBeGreaterThan(0)
      if (category === 'solar-panel') expect(specs.powerW, entry.product.name).toBeGreaterThan(0)
      if (category === 'connector') expect(specs).toEqual({ capacityKwh: null, powerW: null })
      if (category !== 'connector') expect(entry.specSource, entry.product.name).toBe('name+description')
    }
  })

  it('computes price per unit', () => {
    const vault = products.find(p => p.name === 'EcoCharge HomeVault 10')
    expect(vault?.unitPrice).toEqual({ value: 149.9, unit: 'kWh' })
  })

  it('generates unique ids', () => {
    expect(new Set(products.map(p => p.id)).size).toBe(products.length)
  })
})
