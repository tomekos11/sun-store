import { buildCatalog, type Catalog } from '../lib/catalog'

let catalog: Promise<Catalog> | undefined

// CSV is a Nitro server asset (bundled with the build), parsed once and cached in memory.
export function useCatalog(): Promise<Catalog> {
  catalog ??= (async () => {
    const csv = await useStorage('assets:server').getItem<string>('products.csv')
    if (typeof csv !== 'string' || !csv) throw new Error('products.csv not found in server assets')

    const result = buildCatalog(csv)
    if (result.warnings.length) console.warn(`[catalog] ${result.warnings.length} data warning(s):\n  ${result.warnings.join('\n  ')}`)
    return result
  })().catch((error) => {
    catalog = undefined // retry on next request
    throw error
  })
  return catalog
}
