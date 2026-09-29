/**
 * Limiteur de débit en mémoire, fenêtre glissante simplifiée.
 *
 * La route `POST /api/leads` est publique et déclenche un appel vers un
 * service externe : sans garde-fou, un script peut inonder le webhook du
 * CRM. Ce compteur est volontairement simple (par IP, par minute) — il
 * reste juste assez efficace pour la démo. En production multi-instance,
 * le remplacer par un compteur partagé (Vercel KV, Upstash, WAF).
 */

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 5

type Bucket = { count: number; resetAt: number }

const globalForRateLimit = globalThis as typeof globalThis & {
  __borealRateLimit?: Map<string, Bucket>
}

const buckets = (globalForRateLimit.__borealRateLimit ??= new Map())

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  bucket.count += 1

  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Adresse de l'appelant, telle que vue par le serveur. */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return headers.get("x-real-ip") ?? "inconnu"
}
