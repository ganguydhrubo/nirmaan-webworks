/**
 * Builder navigation ↔ browser history.
 *
 * Root cause of the "Back never gets me home" bug (2026-10-17): screen changes
 * inside the builder (start → wizard → editor) never touched the URL or the
 * history stack, so the address bar showed the wrong screen (e.g. "?start=ai"
 * while on the start screen), browser Back jumped straight off the app, and the
 * in-app "← ATITTLE" link pointed at the builder landing page — so clicking the
 * in-app back links bounced between /free-website-builder and /app forever and
 * never reached atittle.com.
 *
 * Now every screen has its own URL and history entry:
 *   /free-website-builder/app                 start screen
 *   /free-website-builder/app?start=ai        AI brief (wizard)
 *   /free-website-builder/app?start=templates start screen, scrolled to templates
 *   /free-website-builder/app?project=<id>    editor
 * Browser Back/Forward move between them (App listens to popstate), and
 * in-app back buttons use real history when there is an in-app entry to go back
 * to, with a reliable fallback to the main homepage otherwise.
 */

export type Route = { name: "start"; templates?: boolean } | { name: "wizard" } | { name: "editor"; project: string };

const APP_PATH = "/free-website-builder/app";
/** Main site homepage — relative so it is atittle.com in production and the dev server locally. */
export const HOME_URL = "/";

interface NavState {
  atb: 1;
  /** How many in-app entries sit below this one in the history stack. */
  depth: number;
}

function state(): NavState | null {
  const s = history.state as NavState | null;
  return s && s.atb === 1 ? s : null;
}

export function urlFor(route: Route): string {
  const params = new URLSearchParams();
  if (route.name === "wizard") params.set("start", "ai");
  if (route.name === "start" && route.templates) params.set("start", "templates");
  if (route.name === "editor") params.set("project", route.project);
  const q = params.toString();
  return q ? `${APP_PATH}?${q}` : APP_PATH;
}

export function routeFromLocation(loc: Location = window.location): Route {
  const params = new URLSearchParams(loc.search);
  const project = params.get("project");
  if (project) return { name: "editor", project };
  if (params.get("start") === "ai") return { name: "wizard" };
  return { name: "start", templates: params.get("start") === "templates" };
}

/** Mark the entry the app was opened on (keeps whatever URL it has). */
export function initNav(): void {
  if (!state()) history.replaceState({ atb: 1, depth: 0 } satisfies NavState, "", location.href);
}

export function pushRoute(route: Route): void {
  const depth = (state()?.depth ?? 0) + 1;
  history.pushState({ atb: 1, depth } satisfies NavState, "", urlFor(route));
}

export function replaceRoute(route: Route): void {
  history.replaceState({ atb: 1, depth: state()?.depth ?? 0 } satisfies NavState, "", urlFor(route));
}

/** True when Back would land on another builder screen (not leave the app). */
export function canGoBackInApp(): boolean {
  return (state()?.depth ?? 0) > 0;
}

/**
 * "Leave the builder" back: return to the previous page on this site when the
 * visitor came from one; otherwise (opened directly, new tab, external link)
 * go to the main homepage. Never loops back into the builder.
 */
export function leaveBuilder(): void {
  const ref = document.referrer;
  let cameFromSite = false;
  try {
    const u = new URL(ref);
    cameFromSite = u.origin === location.origin && !u.pathname.startsWith(APP_PATH);
  } catch {
    cameFromSite = false;
  }
  if (cameFromSite && history.length > 1 && !canGoBackInApp()) {
    history.back();
    return;
  }
  location.assign(HOME_URL);
}
