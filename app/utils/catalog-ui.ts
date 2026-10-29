import type { SortOption } from '#shared/utils/filters'

const CATEGORY_ICONS: Record<string, string> = {
  'battery': 'i-lucide-battery-charging',
  'solar-panel': 'i-lucide-solar-panel',
  'connector': 'i-lucide-cable',
}

export function categoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? 'i-lucide-package'
}

export const SORT_LABELS: Record<SortOption, string> = {
  'relevance': 'Relevance',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'unit-price-asc': 'Price per kWh / W',
  'capacity-desc': 'Capacity: high to low',
  'capacity-asc': 'Capacity: low to high',
  'power-desc': 'Power: high to low',
  'power-asc': 'Power: low to high',
}
