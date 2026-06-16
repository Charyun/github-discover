export const dynamic = 'force-dynamic'

/**
 * Dev-only debug endpoint. Returns whether ADMIN_PASSWORD env var is
 * configured. Does NOT echo the password. Guard with NODE_ENV=development.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not available in production' }, { status: 404 })
  }
  const pwd = process.env.ADMIN_PASSWORD ?? ''
  return Response.json({
    ok: true,
    adminPasswordLength: pwd.length,
    databaseUrlSet: !!process.env.DATABASE_URL,
  })
}
