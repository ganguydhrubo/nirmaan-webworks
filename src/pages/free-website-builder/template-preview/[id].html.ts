import type { APIRoute, GetStaticPaths } from "astro";
import { renderPageDocument } from "@/lib/builder/render";
import { TEMPLATE_LIST, templateDoc } from "@/lib/builder/templates";

/**
 * Static, script-free renders of each builder template's home page, shown
 * as live thumbnails on the builder landing page and start screen. They are
 * the real renderer's output, so the thumbnails are exactly what a visitor
 * gets. noindex: these are previews of sample content, not real businesses.
 */
export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => TEMPLATE_LIST.map((t) => ({ params: { id: t.id } }));

export const GET: APIRoute = ({ params }) => {
  const doc = templateDoc(String(params.id))!;
  const html = renderPageDocument(doc, doc.pages[0]!, {
    mode: "export",
    pageHref: () => "#",
    assetUrl: () => "",
    headExtra: '<meta name="robots" content="noindex, nofollow" />\n<base target="_blank" />',
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
};
