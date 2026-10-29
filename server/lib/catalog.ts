import type { Product, SpecKind, UnitPrice } from '#shared/types/catalog'
import { categorySpec, slugify } from '#shared/utils/filters'
import { parseCsvRecords } from './csv'
import { extractSpec, type SpecSource } from './specs'
import type MiniSearch from 'minisearch'
import { createSearchIndex } from './search'

export interface CatalogEntry {
  product: Product
  // row order from the CSV, used as default sort
  index: number
  specSource: SpecSource | null
}

export interface Catalog {
  entries: CatalogEntry[]
  index: MiniSearch
  warnings: string[]
}

function unitPrice(price: number, kind: SpecKind | null, value: number | null): UnitPrice | null {
  if (!kind || !value) return null
  return {
    value: Math.round((price / value) * 10_000) / 10_000,
    unit: kind === 'capacity' ? 'kWh' : 'W',
  }
}

export function buildCatalog(csv: string): Catalog {
  const warnings: string[] = []
  const entries: CatalogEntry[] = []
  const ids = new Set<string>()

  parseCsvRecords(csv).forEach((row, rowIndex) => {
    const line = rowIndex + 2 // 1-based + header
    const name = row.name ?? ''
    const manufacturer = row.manufacturer ?? ''
    const description = row.description ?? ''
    const category = slugify(row.category ?? '')
    const price = Number(row.price)

    if (!name || !manufacturer || !category) {
      warnings.push(`line ${line}: missing name/manufacturer/category, skipped`)
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      warnings.push(`line ${line}: invalid price "${row.price}", skipped`)
      return
    }

    // specs depend on category, so e.g. a battery's "5 kW output" doesn't become panel power
    const kind = categorySpec(category)
    const spec = kind ? extractSpec(kind, { name, description }, { nameFallback: true }) : null
    if (kind && !spec) warnings.push(`line ${line}: no ${kind} found for "${name}"`)
    if (spec && spec.source !== 'name+description') {
      warnings.push(`line ${line}: ${kind} for "${name}" taken from ${spec.source} only`)
    }

    let id = slugify(name)
    for (let n = 2; ids.has(id); n++) id = `${slugify(name)}-${n}`
    ids.add(id)

    const capacityKwh = kind === 'capacity' ? spec?.value ?? null : null
    const powerW = kind === 'power' ? spec?.value ?? null : null

    entries.push({
      index: entries.length,
      specSource: spec?.source ?? null,
      product: {
        id,
        name,
        manufacturer,
        manufacturerSlug: slugify(manufacturer),
        category,
        price,
        description,
        specs: { capacityKwh, powerW },
        unitPrice: unitPrice(price, kind, spec?.value ?? null),
      },
    })
  })

  return { entries, index: createSearchIndex(entries), warnings }
}
