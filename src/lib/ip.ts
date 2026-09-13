/**
 * We never store raw visitor IPs (DPDP data-minimisation). Instead we keep a
 * salted SHA-256 hash, which is enough to rate-limit and de-duplicate abuse
 * without retaining an identifying value.
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cloudflare always sets CF-Connecting-IP on requests reaching a Worker. */
export function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "0.0.0.0";
}
