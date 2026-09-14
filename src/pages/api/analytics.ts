import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { siteConfig } from "@config/site";

export const prerender = false;

const ALLOWED_EVENTS = new Set(["whatsapp_click", "demo_view", "enquiry_submit", "enquiry_success", "call_click", "cta_click"]);
const MAX_ANALYTICS_BYTES = 2048;

let recentEvents: number[] = [];

/**
 * Fire-and-forget first-party event collector. Never blocks rendering or the
 * enquiry flow, and any failure here must be a silent no-op from the
 * caller's perspective (see ARCHITECTURE.md — analytics is not on the
 * critical path of anything).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const db = env.DB;
    if (!db) return new Response(null, { status: 204 });

    // 1. Origin verification
    const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
    const allowedHost = new URL(siteConfig.siteUrl).host;
    const requestHost = new URL(request.url).host;
    const originHost = (() => {
      try { return origin ? new URL(origin).host : ""; } catch { return ""; }
    })();
    if (originHost && originHost !== allowedHost && originHost !== requestHost) {
      return new Response(null, { status: 204 });
    }

    // 2. Payload size guard
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_ANALYTICS_BYTES) {
      return new Response(null, { status: 204 });
    }

    // 3. Abuse guard (max 60 events/minute per worker isolate)
    const now = Date.now();
    recentEvents = recentEvents.filter((t) => now - t < 60000);
    if (recentEvents.length >= 60) {
      return new Response(null, { status: 204 });
    }
    recentEvents.push(now);

    const body = (await request.json()) as { event?: string; path?: string; demoSlug?: string; category?: string };
    if (!body.event || !ALLOWED_EVENTS.has(body.event)) {
      return new Response(null, { status: 204 });
    }

    await db
      .prepare(`INSERT INTO analytics_events (id, created_at, event_name, page_path, demo_slug, category, meta) VALUES (?1,?2,?3,?4,?5,?6,?7)`)
      .bind(
        crypto.randomUUID(),
        new Date().toISOString(),
        body.event,
        String(body.path ?? "").slice(0, 300),
        body.demoSlug ? String(body.demoSlug).slice(0, 100) : null,
        body.category ? String(body.category).slice(0, 100) : null,
        null,
      )
      .run();

    return new Response(null, { status: 204 });
  } catch {
    // Analytics must never surface an error to the client.
    return new Response(null, { status: 204 });
  }
};

export const GET: APIRoute = () => new Response(null, { status: 405 });
