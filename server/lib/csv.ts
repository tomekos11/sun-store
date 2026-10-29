import { parse } from 'csv-parse/sync'

export function parseCsvRecords(input: string): Record<string, string>[] {
  return parse(input, {
    bom: true,
    columns: (header: string[]) => header.map(h => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  })
}
