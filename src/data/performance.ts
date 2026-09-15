/**
 * Real, measured Lighthouse numbers — populated by actually running
 * Lighthouse against the built site, never estimated or invented.
 *
 * Re-measured against the live production URL (webjobs-site.vercel.app,
 * the real Vercel deployment — see ARCHITECTURE.md) on 2026-09-15,
 * replacing an earlier round measured against `wrangler dev --local`
 * (a local Miniflare emulation), which understated the homepage's real
 * performance score by ~28 points due to emulation overhead. These are
 * genuine production numbers, not a local sanity check.
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
  measuredOn: "2026-09-15",
  device: "Lighthouse mobile preset, simulated throttling, against the live production URL (webjobs-site.vercel.app)",
  pages: [
    {
      path: "/",
      label: "Homepage",
      performance: 99,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
      lcpMs: 2002,
      inpMs: 0,
      cls: 0,
    },
    {
      path: "/demos/anaar-awadhi-table",
      label: "Anaar — The Awadhi Table (demo)",
      performance: 100,
      accessibility: 100,
      bestPractices: 100,
      seo: 69,
      lcpMs: 1318,
      inpMs: 0,
      cls: 0.012,
      note: "SEO score is 69 by design — the only failing audit is 'blocked from indexing', which is the noindex tag working as intended on a demo page.",
    },
  ] as PagePerformance[],
};
