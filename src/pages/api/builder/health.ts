import type { APIRoute } from "astro";
import { getProviderHealth } from "@/lib/ai/chat-provider";
import { getImageAvailability } from "@/lib/ai/image-provider";
import { getQuotaLimits } from "@/lib/builder/quota";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const prerender = false;

/**
 * Admin-only builder health: provider availability from REAL recent request
 * outcomes on this instance (success rate, last error category, cooldowns),
 * image availability and configured limits. Never returns keys.
 *
 * Auth: send `Authorization: Bearer <BUILDER_ADMIN_TOKEN>`. Without that env
 * var set, the endpoint is disabled (404) rather than public.
 */
export const GET: APIRoute = async ({ request }) => {
  const env = await getRuntimeEnv();
  const token = typeof env.BUILDER_ADMIN_TOKEN === "string" ? env.BUILDER_ADMIN_TOKEN : "";
  if (!token) return new Response("Not found", { status: 404 });
  const auth = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(auth, `Bearer ${token}`)) return new Response("Unauthorized", { status: 401 });
  const [text, image, textLimits, imageLimits] = await Promise.all([getProviderHealth(), getImageAvailability(), getQuotaLimits("text"), getQuotaLimits("image")]);
  return new Response(
    JSON.stringify({ ok: true, at: new Date().toISOString(), note: "Per-instance, best-effort (serverless instances don't share memory).", text, image, limits: { text: textLimits, image: imageLimits } }, null, 2),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
