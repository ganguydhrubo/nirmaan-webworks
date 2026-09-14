import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => {
  return redirect("/sitemap-index.xml", 301);
};
