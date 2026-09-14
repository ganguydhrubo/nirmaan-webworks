import type { APIRoute } from "astro";
import { evaluateWebsiteWithGroq, type EvaluationInput } from "@/lib/ai/groq-evaluator";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return json({ ok: false, error: "Expected Content-Type: application/json" }, 415);
    }

    const body = (await request.json().catch(() => null)) as Partial<EvaluationInput> | null;

    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON request body." }, 400);
    }

    const businessName = (body.businessName ?? "").toString().trim();
    const category = (body.category ?? "").toString().trim() || "Local Business";
    const city = (body.city ?? "").toString().trim() || "India";
    const websiteUrl = (body.websiteUrl ?? "").toString().trim();
    const copyText = (body.copyText ?? "").toString().trim();

    if (!businessName) {
      return json({ ok: false, error: "Please enter your business or company name." }, 400);
    }

    if (!copyText && !websiteUrl) {
      return json(
        {
          ok: false,
          error: "Please provide your website URL or paste your hero headline and website copy for analysis.",
        },
        400,
      );
    }

    // Call evaluator (server-side AI key only — no client-supplied key path,
    // see AUDIT.md: bring-your-own-key was removed at the user's request).
    const result = await evaluateWebsiteWithGroq({
      businessName,
      category,
      city,
      websiteUrl,
      copyText,
    });

    return json({ ok: true, data: result }, 200);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "An unexpected error occurred while analyzing the website.";
    console.error("[/api/evaluate] Error during evaluation:", error);
    return json(
      {
        ok: false,
        error: errMessage,
      },
      500,
    );
  }
};
