import { describe, expect, it } from 'vitest'
import { parseCsvRecords } from '../../server/lib/csv'

describe('parseCsvRecords', () => {
  it('maps rows to trimmed, lower-cased header keys', () => {
    expect(parseCsvRecords(' Name ,Price\nPanel , 10 \n')).toEqual([{ name: 'Panel', price: '10' }])
  })

  it('handles quoted fields with commas, escaped quotes and newlines', () => {
    const csv = 'name,description\nA,"x, y"\nB,"say ""hi"""\nC,"multi\nline"\n'
    expect(parseCsvRecords(csv).map(r => r.description)).toEqual(['x, y', 'say "hi"', 'multi\nline'])
  })

  it('handles BOM, CRLF and blank lines', () => {
    expect(parseCsvRecords('﻿name,price\r\n\r\nPanel,10\r\n')).toEqual([{ name: 'Panel', price: '10' }])
  })

  it('does not fail on rows with missing columns', () => {
    expect(parseCsvRecords('name,price\nShort\n')).toEqual([{ name: 'Short' }])
  })
})
