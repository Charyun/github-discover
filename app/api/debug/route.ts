import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, string>
    const pwd = env['ADMIN_PASSWORD'] ?? ''
    const { searchParams } = new URL(req.url)
    const test = searchParams.get('test') ?? ''
    return Response.json({
      ok: true,
      adminPasswordLength: pwd.length,
      adminPasswordTrimmedLength: pwd.trim().length,
      adminPasswordFirstCharCode: pwd.charCodeAt(0),
      adminPasswordLastCharCode: pwd.charCodeAt(pwd.length - 1),
      testMatch: test ? test === pwd : undefined,
      testTrimMatch: test ? test === pwd.trim() : undefined,
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
