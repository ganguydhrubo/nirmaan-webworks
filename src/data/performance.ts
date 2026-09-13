/**
 * Real, measured Lighthouse numbers — populated by running the performance
 * audit (see TESTING.md) against the built site, never estimated or
 * invented. `measuredOn` must be updated whenever these numbers are
 * refreshed. Until the first real measurement is taken, `measured` is
 * false and the Proof section shows an honest "measuring, not guessing"
 * framing instead of a number.
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
}

export const performanceReport = {
  measured: false,
  measuredOn: "",
  device: "Emulated mid-range Android (Moto G Power), 4x CPU throttle, Slow 4G",
  pages: [] as PagePerformance[],
};
