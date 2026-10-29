import type { SpecKind } from '#shared/types/catalog'

// Capacity (kWh) / power (W) from the description, checked against the model
// number in the name. Descriptions often have more than one value, e.g.
// "7.5kWh ... for a total of 30kWh", and the name tells which one is right.

export type SpecSource = 'name+description' | 'description' | 'name'

export interface ExtractedSpec {
  value: number
  source: SpecSource
}

interface UnitRule {
  pattern: RegExp
  toBase: (unit: string) => number
  plausible: [min: number, max: number]
}

const RULES: Record<SpecKind, UnitRule> = {
  capacity: {
    pattern: /(?<![\d.,])(\d+(?:[.,]\d+)?)\s?(kWh|Wh)(?![a-z])/gi,
    toBase: unit => (unit.toLowerCase() === 'wh' ? 1 / 1000 : 1),
    plausible: [0.1, 1000],
  },
  power: {
    // (?![a-z]) so that "Wh" is not read as W
    pattern: /(?<![\d.,])(\d+(?:[.,]\d+)?)\s?(kWp|kW|Wp|W)(?![a-z])/gi,
    toBase: unit => (unit.toLowerCase().startsWith('k') ? 1000 : 1),
    plausible: [1, 1000],
  },
}

// "7,5" -> 7.5, but "6,000" -> 6000 (comma + 3 digits = thousands separator)
export function parseLocaleNumber(raw: string): number {
  const normalised = /,\d{3}$/.test(raw) ? raw.replace(',', '') : raw.replace(',', '.')
  return Number(normalised)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function isPlausible(kind: SpecKind, value: number): boolean {
  const [min, max] = RULES[kind].plausible
  return Number.isFinite(value) && value >= min && value <= max
}

export function findSpecValues(kind: SpecKind, text: string): number[] {
  const rule = RULES[kind]
  const values: number[] = []
  for (const match of text.matchAll(rule.pattern)) {
    const [, rawNumber, unit] = match
    if (!rawNumber || !unit) continue
    const value = round(parseLocaleNumber(rawNumber) * rule.toBase(unit))
    if (isPlausible(kind, value)) values.push(value)
  }
  return values
}

// last standalone number in the name, "HomeVault 13.5" -> 13.5 (ignores "15A", "2-1")
export function modelNumber(name: string): number | null {
  const tokens = name.split(/\s+/).filter(t => /^\d+(?:\.\d+)?$/.test(t))
  const last = tokens.at(-1)
  return last === undefined ? null : Number(last)
}

export interface ExtractOptions {
  nameFallback?: boolean
}

export function extractSpec(
  kind: SpecKind,
  product: { name: string, description: string },
  options: ExtractOptions = {},
): ExtractedSpec | null {
  const candidates = findSpecValues(kind, product.description)
  const fromName = modelNumber(product.name)

  if (fromName !== null && candidates.includes(fromName)) {
    return { value: fromName, source: 'name+description' }
  }
  // first value is usually the main spec, later ones are totals/modules
  const [firstCandidate] = candidates
  if (firstCandidate !== undefined) {
    return { value: firstCandidate, source: 'description' }
  }
  if (options.nameFallback && fromName !== null && isPlausible(kind, fromName)) {
    return { value: fromName, source: 'name' }
  }
  return null
}
