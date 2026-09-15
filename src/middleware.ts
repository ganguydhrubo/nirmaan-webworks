import { defineMiddleware } from "astro:middleware";

// Canonicalize www.atittle.com -> atittle.com. Both currently resolve and
// serve identical content (www was only just added as a Vercel domain so
// its SSL certificate would provision), which is a duplicate-content risk
// even with <link rel="canonical"> pointing at the apex on every page (see
// BaseLayout.astro). A 301 here is portable across both deploy targets;
// each platform's own dashboard-level "redirect domain" setting is the
// other half of belt-and-suspenders for routes served as static assets
// that bypass this middleware.
export const onRequest = defineMiddleware((context, next) => {
  if (context.url.hostname.startsWith("www.")) {
    const target = new URL(context.url);
    target.hostname = context.url.hostname.slice(4);
    return context.redirect(target.toString(), 301);
  }
  return next();
});
