import type { APIRoute } from "astro";
import { z } from "zod";
import { ChatError } from "@/lib/ai/chat-provider";
import { generateImage, getImageAvailability } from "@/lib/ai/image-provider";
import { acquireSlot, consumeCredit, visitorKey } from "@/lib/builder/quota";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

const STYLE_HINTS: Record<string, string> = {
  photo: "Photorealistic professional photograph, natural light, realistic detail.",
  illustration: "Flat vector illustration with clean shapes and a limited colour palette.",
  minimal: "Minimal, airy composition with plenty of negative space and soft neutral tones.",
  "3d": "Soft 3D render, gentle studio lighting, smooth materials.",
  watercolor: "Hand-painted watercolour style with soft edges and paper texture.",
};

const imageSchema = z.object({
  prompt: z.string().trim().min(3, "Describe the image you want.").max(600),
  aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2"]).default("4:3"),
  style: z.enum(["photo", "illustration", "minimal", "3d", "watercolor"]).default("photo"),
});

/** What the editor shows before anyone clicks "Generate": real availability, never just "a key exists". */
export const GET: APIRoute = async () => {
  const a = await getImageAvailability();
  return json({ ok: true, available: a.available, reason: a.reason ?? null }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const started = Date.now();
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ ok: false, code: "unsupported_media_type", message: "Expected JSON." }, 415);
  const raw = await request.text().catch(() => "");
  if (raw.length > 4000) return json({ ok: false, code: "too_large", message: "That request is too large." }, 413);
  let parsed: z.infer<typeof imageSchema>;
  try {
    const r = imageSchema.safeParse(JSON.parse(raw));
    if (!r.success) return json({ ok: false, code: "invalid_input", message: r.error.issues[0]?.message ?? "Invalid request." }, 400);
    parsed = r.data;
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Invalid request." }, 400);
  }

  const availability = await getImageAvailability();
  if (!availability.available) {
    log({ ok: false, ms: 0, error: "unavailable" });
    return json({ ok: false, code: "unavailable", message: availability.reason }, 503);
  }

  const visitor = await visitorKey(request);
  const release = acquireSlot(`img:${visitor}`);
  if (!release) return json({ ok: false, code: "busy", message: "Your previous image is still being generated." }, 409);
  const quota = await consumeCredit(request, "image");
  if (!quota.allowed) {
    release();
    return json(
      { ok: false, code: "quota_exceeded", message: quota.reason === "global" ? "Today's free AI images are used up. Please try again tomorrow, or upload a photo." : `You've used your ${quota.limit} free AI images for today. You can upload your own photos or use an illustration.`, remaining: 0 },
      429,
    );
  }

  try {
    // The style hint and a no-text instruction are appended server-side; the
    // visitor's text is the subject. Prompts aren't logged.
    const prompt = `${parsed.prompt}\n\nStyle: ${STYLE_HINTS[parsed.style]} Suitable for a professional business website. Do not include any text, letters, logos or watermarks.`;
    const img = await generateImage({ prompt, aspectRatio: parsed.aspectRatio, timeoutMs: 55_000 });
    log({ ok: true, ms: Date.now() - started, provider: img.provider, model: img.model, width: img.width, height: img.height, trace: img.trace });
    return json(
      { ok: true, image: { dataUrl: `data:${img.mime};base64,${img.base64}`, mime: img.mime, width: img.width, height: img.height, provider: img.provider, model: img.model, prompt: parsed.prompt }, remaining: quota.remaining },
      200,
    );
  } catch (err) {
    await quota.refund();
    const e = err instanceof ChatError ? err : new ChatError("provider_error", "image failed");
    log({ ok: false, ms: Date.now() - started, error: e.code, trace: (err as { trace?: unknown }).trace });
    const message =
      e.code === "unavailable" || e.code === "not_configured"
        ? "AI image generation is unavailable right now (the image service's quota is used up). You can upload a photo or use an illustration instead."
        : e.code === "rate_limited"
          ? "The image service is busy. Please try again in a minute."
          : e.code === "empty_output" || e.code === "invalid_json"
            ? "The AI didn't return a usable image. Try describing the picture differently."
            : "Image generation failed. Please try again.";
    return json({ ok: false, code: e.code, message, remaining: quota.remaining + 1 }, e.code === "rate_limited" ? 429 : e.code === "unavailable" || e.code === "not_configured" ? 503 : 502);
  } finally {
    release();
  }
};

function log(fields: Record<string, unknown>): void {
  console.info(JSON.stringify({ event: "builder_image", ...fields }));
}
