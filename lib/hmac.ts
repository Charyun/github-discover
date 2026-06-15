export async function verifyHmacSha256(secret: string, body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expectedBytes = new Uint8Array(sigBuffer)

  // Decode hex signature to bytes
  const sigHex = signature.replace(/[^0-9a-f]/gi, '')
  if (sigHex.length !== expectedBytes.length * 2) return false
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))

  // Constant-time comparison
  let diff = 0
  for (let i = 0; i < expectedBytes.length; i++) diff |= expectedBytes[i] ^ sigBytes[i]
  return diff === 0
}
