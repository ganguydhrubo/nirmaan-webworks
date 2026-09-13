/**
 * Fire-and-forget click analytics. Never blocks navigation, never throws
 * visibly — a failure here must be invisible to the visitor.
 */
function send(event: string, extra: Record<string, string | undefined> = {}) {
  try {
    const body = JSON.stringify({ event, path: location.pathname, ...extra });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // silent — analytics must never affect the user experience
  }
}

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement)?.closest<HTMLElement>("[data-analytics-event]");
  if (!el) return;
  send(el.dataset.analyticsEvent!, {
    demoSlug: el.dataset.demoSlug,
    category: el.dataset.category,
  });
});
