/**
 * Real, measured Lighthouse numbers — populated by actually running
 * Lighthouse against the built site, never estimated or invented.
 *
 * IMPORTANT CAVEAT: these numbers were measured against `wrangler dev
 * --local` (a local Miniflare emulation of the Cloudflare Workers runtime
 * serving the real `dist/client` build), not a real Cloudflare edge
 * deployment — this build has no live account to deploy to (see README.md).
 * Local Miniflare has emulation overhead a real edge deployment does not,
 * so these numbers are a legitimate lower bound / sanity check, not a
 * substitute for re-measuring against the live production URL after
 * deploying (see DEPLOYMENT.md's smoke-test checklist, which requires
 * exactly that before these numbers should be trusted for real).
 *
 * The homepage's LCP (5.2s) in particular is almost certainly inflated by
 * local-emulation + Lighthouse's "simulate" throttling interacting oddly
 * with localhost's near-zero real network latency — it should be re-run
 * with `--throttling-method=devtools` against the live URL to get a
 * trustworthy figure; the 71 performance score should be treated as "not
 * yet confirmed to meet the ≤95 budget in Section 14," not as a passing
 * grade.
 *
 * The Anaar demo's SEO score (69, not 100) is EXPECTED and correct: its
 * only failing audit is "Page is blocked from indexing," which is exactly
 * what `noindex` is supposed to do for demo pages (see SEO.md) — not a bug.
 */
export interface PagePerformance {
  path: string;
  label: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcpMs: number;
  inpMs: number;
  cls: number;
  note?: string;
}

export const performanceReport = {
  measured: true,
  measuredOn: "2026-09-14",
  device: "Lighthouse mobile preset, simulated throttling, against wrangler dev --local (see caveat above — re-measure against live production before trusting for real)",
  pages: [
    {
      path: "/",
      label: "Homepage",
      performance: 71,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
      lcpMs: 5185,
      inpMs: 0,
      cls: 0,
      note: "Performance score and LCP likely inflated by local Miniflare emulation — re-measure against the live URL before treating as a real result against the Section 14 budget.",
    },
    {
      path: "/demos/anaar-awadhi-table",
      label: "Anaar — The Awadhi Table (demo)",
      performance: 93,
      accessibility: 100,
      bestPractices: 100,
      seo: 69,
      lcpMs: 2725,
      inpMs: 0,
      cls: 0.0002,
      note: "SEO score is 69 by design — the only failing audit is 'blocked from indexing', which is the noindex tag working as intended on a demo page.",
    },
  ] as PagePerformance[],
};
