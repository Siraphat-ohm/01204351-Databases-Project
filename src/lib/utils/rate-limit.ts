type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterMs: options.windowMs,
    };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  buckets.set(options.key, existing);

  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
}

export function getClientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

type ApiRateLimitOptions = {
  headers: Headers;
  namespace: string;
  userId: string;
  action: 'read' | 'write';
  readLimit?: number;
  writeLimit?: number;
  windowMs?: number;
};

export function enforceApiRateLimit(options: ApiRateLimitOptions) {
  const ip = getClientIpFromHeaders(options.headers);
  return checkRateLimit({
    key: `${options.namespace}:${options.action}:${options.userId}:${ip}`,
    limit: options.action === 'read' ? (options.readLimit ?? 120) : (options.writeLimit ?? 30),
    windowMs: options.windowMs ?? 60_000,
  });
}
