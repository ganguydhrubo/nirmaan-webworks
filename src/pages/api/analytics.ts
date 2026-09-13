import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const ALLOWED_EVENTS = new Set(["whatsapp_click", "demo_view", "enquiry_submit", "enquiry_success", "call_click", "cta_click"]);

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

    const body = (await request.json()) as { event?: string; path?: string; demoSlug?: string; category?: string };
    if (!body.event || !ALLOWED_EVENTS.has(body.event)) {
      return new Response(null, { status: 204 });
    }

    await db
      .prepare(`INSERT INTO analytics_events (id, created_at, event_name, page_path, demo_slug, category, meta) VALUES (?1,?2,?3,?4,?5,?6,?7)`)
      .bind(crypto.randomUUID(), new Date().toISOString(), body.event, (body.path ?? "").slice(0, 300), body.demoSlug ?? null, body.category ?? null, null)
      .run();

    return new Response(null, { status: 204 });
  } catch {
    // Analytics must never surface an error to the client.
    return new Response(null, { status: 204 });
  }
};

export const GET: APIRoute = () => new Response(null, { status: 405 });
