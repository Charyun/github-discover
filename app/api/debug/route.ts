import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>
    const keys = Object.keys(env)
    return Response.json({
      ok: true,
      cfEnvKeys: keys,
      hasAdminPassword: 'ADMIN_PASSWORD' in env,
      hasAdminSecret: 'ADMIN_SECRET' in env,
      adminPasswordType: typeof env['ADMIN_PASSWORD'],
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
