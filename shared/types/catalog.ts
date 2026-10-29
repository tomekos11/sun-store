export type SpecKind = 'capacity' | 'power'

export interface ProductSpecs {
  capacityKwh: number | null
  powerW: number | null
}

export interface UnitPrice {
  value: number
  unit: 'kWh' | 'W'
}

export interface Product {
  id: string
  name: string
  manufacturer: string
  manufacturerSlug: string
  category: string
  price: number
  description: string
  specs: ProductSpecs
  // €/kWh for batteries, €/W for panels
  unitPrice: UnitPrice | null
}

export interface NumericRange {
  min: number | null
  max: number | null
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

export interface Bounds {
  min: number
  max: number
}

export interface CatalogFacets {
  categories: FacetOption[]
  manufacturers: FacetOption[]
  price: Bounds | null
  capacity: Bounds | null
  power: Bounds | null
}

export interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  // min/max price of all matching products, not only the current page
  priceRange: Bounds | null
  facets: CatalogFacets
}
