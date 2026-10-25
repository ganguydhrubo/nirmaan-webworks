/**
 * Client side of "Publish Live Free" (server: src/pages/api/builder/publish.ts).
 *
 *   validating → preparing → uploading → deploying → verifying → published
 *                                  ↘ failed (→ retrying on retryable errors)
 *
 * "Published" is only shown after the live URL itself serves the version the
 * server built — never on the strength of an upload response alone.
 */
import { buildSiteFiles, siteVersion } from "@/lib/builder/export";
import { hasContent, type SiteDoc } from "@/lib/builder/schema";
import type { PublishInfo } from "./persistence";

export type PublishPhase = "validating" | "preparing" | "uploading" | "deploying" | "verifying" | "published" | "failed" | "retrying";

export interface PublishProgress {
  phase: PublishPhase;
  /** 0–1 during "uploading". */
  progress?: number;
  message?: string;
}

export interface PublishFailure {
  code: string;
  message: string;
  retryable: boolean;
}

/** A failure may still carry `info` when the upload succeeded but the live check timed out. */
export type PublishOutcome = { ok: true; info: PublishInfo; bytes: number } | ({ ok: false; info?: PublishInfo } & PublishFailure);

const ENDPOINT = "/api/builder/publish";
/** Keep in step with the server's MAX_BODY_BYTES (Vercel request limit). */
export const MAX_PUBLISH_BODY = 4_400_000;
const VERIFY_TIMEOUT_MS = 120_000;

/** Why the site can't be published yet, or null if it can. */
export function publishBlocker(doc: SiteDoc): string | null {
  if (!hasContent(doc)) return "Add at least one section to your website first.";
  return null;
}

function upload(body: string, onProgress: (p: number) => void, onSent: () => void, signal?: AbortSignal): Promise<{ status: number; data: Record<string, unknown> | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = "text";
    xhr.timeout = 90_000;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.upload.onload = onSent;
    xhr.onload = () => {
      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        data = null;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(new DOMException("Aborted", "AbortError"))), { once: true });
  });

/** Poll until the live site serves `version`. */
export async function waitUntilLive(slug: string, version: string, signal?: AbortSignal, timeoutMs = VERIFY_TIMEOUT_MS): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  let delay = 1200;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${ENDPOINT}?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(version)}`, { signal, cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { live?: boolean } | null;
      if (data?.live === true) return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
    await sleep(delay, signal);
    delay = Math.min(delay * 1.4, 6000);
  }
  return false;
}

async function attempt(doc: SiteDoc, prior: PublishInfo | null, onState: (p: PublishProgress) => void, signal?: AbortSignal): Promise<PublishOutcome> {
  onState({ phase: "validating" });
  const blocker = publishBlocker(doc);
  if (blocker) return { ok: false, code: "empty", message: blocker, retryable: false };

  onState({ phase: "preparing" });
  // The same build "Download Website" uses; its version must match what the server publishes.
  const localVersion = await siteVersion(buildSiteFiles(doc));
  const body = JSON.stringify({ doc, ...(prior ? { slug: prior.slug, manageToken: prior.manageToken } : {}) });
  if (body.length > MAX_PUBLISH_BODY) {
    return { ok: false, code: "too_large", message: "This website is too large to publish for free (images over about 3 MB in total). Use fewer or smaller images, or download it and host it yourself.", retryable: false };
  }

  onState({ phase: "uploading", progress: 0 });
  let res: { status: number; data: Record<string, unknown> | null };
  try {
    res = await upload(body, (p) => onState({ phase: "uploading", progress: p }), () => onState({ phase: "deploying" }), signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, code: "network", message: "Couldn't reach the server. Check your internet connection and try again.", retryable: true };
  }
  const data = res.data;
  if (!data || data.ok !== true) {
    return {
      ok: false,
      code: typeof data?.code === "string" ? data.code : "bad_response",
      message: typeof data?.message === "string" ? data.message : `Unexpected server response (${res.status}). Please try again.`,
      retryable: data ? data.retryable === true : res.status >= 500,
    };
  }

  const slug = String(data.slug);
  const version = String(data.version);
  const info: PublishInfo = {
    slug,
    url: String(data.url),
    manageToken: typeof data.manageToken === "string" ? data.manageToken : (prior?.manageToken ?? ""),
    version,
    publishedAt: Number(data.publishedAt) || Date.now(),
    status: "verifying",
  };
  if (version !== localVersion) console.warn("[publish] server build differs from local build", { localVersion, version });

  onState({ phase: "verifying" });
  const live = await waitUntilLive(slug, version, signal);
  if (!live) {
    return { ok: false, code: "verify_timeout", message: "Your website was uploaded, but it isn't showing at its address yet. This usually clears in a minute — press Check again.", retryable: true, info };
  }
  return { ok: true, info: { ...info, status: "published" }, bytes: Number(data.bytes) || 0 };
}

/** Publish with one automatic retry for transient failures. */
export async function publishSite(doc: SiteDoc, prior: PublishInfo | null, onState: (p: PublishProgress) => void, signal?: AbortSignal): Promise<PublishOutcome> {
  let result = await attempt(doc, prior, onState, signal);
  if (!result.ok && result.retryable && result.code !== "verify_timeout" && result.code !== "busy") {
    onState({ phase: "retrying", message: result.message });
    await sleep(2500, signal);
    result = await attempt(doc, prior, onState, signal);
  }
  return result;
}

export async function unpublishSite(info: PublishInfo): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(ENDPOINT, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: info.slug, manageToken: info.manageToken }) });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return { ok: data?.ok === true, message: data?.message };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Custom Domain & Payment Integrations (October 2026 Standard)
// ---------------------------------------------------------------------------

export interface CustomDomainResult {
  ok: boolean;
  domain?: string;
  slug?: string;
  status?: string;
  domainConnectUrl?: string;
  sslStatus?: string;
  edgeStatus?: string;
  dnsRecords?: { type: string; name: string; value: string; status: string; description?: string }[];
  instructions?: { step1: string; step2: string; step3: string };
  message?: string;
}

export interface DomainSearchResult {
  ok: boolean;
  query: string;
  primary: {
    domain: string;
    tld: string;
    available: boolean;
    priceInr: number;
    period: string;
  };
  alternatives: {
    domain: string;
    tld: string;
    available: boolean;
    priceInr: number;
  }[];
  message?: string;
}

export async function searchDomainAvailability(query: string): Promise<DomainSearchResult | null> {
  try {
    const res = await fetch(`/api/builder/domain/check?query=${encodeURIComponent(query)}`);
    return (await res.json()) as DomainSearchResult;
  } catch {
    return null;
  }
}

export async function connectCustomDomain(domain: string, slug: string): Promise<CustomDomainResult> {
  try {
    const res = await fetch("/api/builder/domain/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, slug }),
    });
    return (await res.json()) as CustomDomainResult;
  } catch {
    return { ok: false, message: "Could not connect to domain service. Check your internet connection." };
  }
}

export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if ((window as any).Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function startRazorpayPayment(opts: {
  plan: "download" | "host" | "domain";
  siteName: string;
  domain?: string;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}): Promise<void> {
  try {
    const res = await fetch("/api/builder/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: opts.plan, siteName: opts.siteName, domain: opts.domain }),
    });
    const order = (await res.json()) as {
      ok: boolean;
      orderId: string;
      keyId: string;
      amountPaise: number;
      currency: string;
      planName: string;
      description: string;
      isPlaceholder: boolean;
    };

    if (!order.ok) {
      alert("Could not initialize order. Please try again.");
      return;
    }

    if (order.isPlaceholder) {
      const proceed = confirm(
        `[ATITTLE Payment Demo]\nPlan: ${order.planName}\nAmount: ₹${order.amountPaise / 100}\n\nRazorpay placeholder is active. Click OK to simulate a successful payment, or Cancel to dismiss.`
      );
      if (proceed) {
        opts.onSuccess(`sim_${Date.now()}`);
      } else {
        opts.onDismiss?.();
      }
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded || !(window as any).Razorpay) {
      alert("Payment gateway could not be loaded. Please check your internet connection.");
      return;
    }

    const rzp = new (window as any).Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "ATITTLE",
      description: order.description,
      order_id: order.orderId,
      image: "https://atittle.com/favicon.svg",
      handler: (response: any) => {
        opts.onSuccess(response.razorpay_payment_id || `pay_${Date.now()}`);
      },
      modal: {
        ondismiss: () => {
          opts.onDismiss?.();
        },
      },
      theme: {
        color: "#c85a32",
      },
    });

    rzp.open();
  } catch (err) {
    console.error("Razorpay error:", err);
    alert("Payment initialization error. Please try again.");
  }
}
