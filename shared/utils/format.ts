import type { NumericRange, UnitPrice } from '../types/catalog'

// fixed locale, otherwise SSR and client output can differ
const LOCALE = 'en-IE'
const currencyCache = new Map<number, Intl.NumberFormat>()

function currency(fractionDigits: number): Intl.NumberFormat {
  let format = currencyCache.get(fractionDigits)
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    currencyCache.set(fractionDigits, format)
  }
  return format
}

// no ".00" for round prices
export function formatPrice(value: number): string {
  return currency(Number.isInteger(value) ? 0 : 2).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(value)
}

export function formatSpec(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`
}

export function formatUnitPrice(unitPrice: UnitPrice): string {
  return `${currency(2).format(unitPrice.value)} / ${unitPrice.unit}`
}

export function formatRange(range: NumericRange, format: (n: number) => string, suffix = ''): string | null {
  const { min, max } = range
  if (min !== null && max !== null) return `${min === max ? format(min) : `${format(min)}–${format(max)}`}${suffix}`
  if (min !== null) return `from ${format(min)}${suffix}`
  if (max !== null) return `up to ${format(max)}${suffix}`
  return null
}
