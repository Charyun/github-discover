import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { checkRequestAuth } from './auth'

beforeEach(() => {
  vi.resetModules()
})

describe('checkRequestAuth', () => {
  it('returns true when cookie matches ADMIN_SECRET', () => {
    process.env.ADMIN_SECRET = 'test-secret-abc123'
    const req = new NextRequest('http://localhost/admin', {
      headers: { cookie: 'admin_session=test-secret-abc123' },
    })
    expect(checkRequestAuth(req)).toBe(true)
  })

  it('returns false when cookie does not match', () => {
    process.env.ADMIN_SECRET = 'test-secret-abc123'
    const req = new NextRequest('http://localhost/admin', {
      headers: { cookie: 'admin_session=wrong-value' },
    })
    expect(checkRequestAuth(req)).toBe(false)
  })

  it('returns false when no cookie present', () => {
    process.env.ADMIN_SECRET = 'test-secret-abc123'
    const req = new NextRequest('http://localhost/admin')
    expect(checkRequestAuth(req)).toBe(false)
  })
})
