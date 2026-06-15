import { describe, it, expect } from 'vitest'

function parseJsonField(val: string | null | undefined): unknown[] {
  try { return JSON.parse(val || '[]') } catch { return [] }
}

describe('parseJsonField', () => {
  it('parses valid JSON array', () => {
    expect(parseJsonField('["a","b"]')).toEqual(['a', 'b'])
  })
  it('returns empty array for null', () => {
    expect(parseJsonField(null)).toEqual([])
  })
  it('returns empty array for invalid JSON', () => {
    expect(parseJsonField('not-json')).toEqual([])
  })
})
