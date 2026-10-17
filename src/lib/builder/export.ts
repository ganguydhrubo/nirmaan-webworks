/**
 * Turns a SiteDoc into the files of a standalone static website.
 *
 *   index.html, <page>.html   one file per page, relative links between them
 *   assets/styles.css         shared stylesheet
 *   assets/images/*           uploaded images, decoded from the document
 *   README.txt                how to put the site online (GoDaddy and others)
 *
 * No editor code, project metadata, or API keys are included: the pages are
 * rendered in "export" mode, which emits no scripts at all.
 */
import { renderCss, renderPageDocument, exportRenderOptions } from "./render";
import { ASSET_MIME_EXT, base64ToBytes, hasContent, pageFileName, type SiteDoc } from "./schema";
import { slugify, ASSET_PREFIX, safeImageSrc } from "./sanitize";
import { createZip, type ZipEntry } from "./zip";

export interface ExportIssue {
  level: "warning" | "info";
  message: string;
}

export function assetPath(doc: SiteDoc, id: string): string {
  const asset = doc.assets[id];
  return asset ? `assets/images/${id}.${ASSET_MIME_EXT[asset.mime]}` : "";
}

export function buildSiteFiles(doc: SiteDoc): ZipEntry[] {
  const opts = { ...exportRenderOptions(), assetUrl: (id: string) => assetPath(doc, id) };
  const files: ZipEntry[] = [];
  for (const page of doc.pages) {
    files.push({ path: pageFileName(page.slug), data: renderPageDocument(doc, page, opts) });
  }
  files.push({ path: "assets/styles.css", data: renderCss(doc.theme) });

  for (const id of usedAssetIds(doc)) {
    const asset = doc.assets[id];
    if (!asset) continue;
    const b64 = asset.dataUrl.slice(asset.dataUrl.indexOf(",") + 1);
    files.push({ path: assetPath(doc, id), data: base64ToBytes(b64) });
  }
  files.push({ path: "README.txt", data: readme(doc) });
  return files;
}

export function exportZip(doc: SiteDoc): { bytes: Uint8Array<ArrayBuffer>; fileName: string } {
  return { bytes: createZip(buildSiteFiles(doc)), fileName: `${slugify(doc.name, "website")}-website.zip` };
}

/** Asset ids actually referenced by some section (unused uploads are left out of the export). */
export function usedAssetIds(doc: SiteDoc): string[] {
  const ids = new Set<string>();
  const visit = (v: unknown) => {
    if (typeof v === "string") {
      if (v.startsWith(ASSET_PREFIX)) ids.add(v.slice(ASSET_PREFIX.length));
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v).forEach(visit);
  };
  for (const p of doc.pages) for (const s of p.sections) visit(s.props);
  return [...ids].filter((id) => id in doc.assets);
}

/**
 * Pre-download checklist: things the user probably wants to fix before the
 * site goes live. Nothing here blocks the download.
 */
export function exportChecklist(doc: SiteDoc): ExportIssue[] {
  const issues: ExportIssue[] = [];
  if (!hasContent(doc)) issues.push({ level: "warning", message: "Your website has no content sections yet." });
  let missingImages = 0;
  let sampleTestimonials = false;
  let placeholderText = false;
  let hasContact = false;
  const assetIds = new Set(Object.keys(doc.assets));

  const visitImages = (v: unknown) => {
    if (v && typeof v === "object" && "src" in (v as object) && "alt" in (v as object)) {
      if (!safeImageSrc((v as { src: unknown }).src, assetIds)) missingImages++;
    } else if (Array.isArray(v)) v.forEach(visitImages);
    else if (v && typeof v === "object") Object.values(v).forEach(visitImages);
  };

  for (const p of doc.pages) {
    for (const s of p.sections) {
      if (s.type === "testimonials" && s.props.isSample !== false) sampleTestimonials = true;
      if (s.type === "contact" && (s.props.email || s.props.phone || s.props.whatsapp || s.props.address)) hasContact = true;
      const showsImage = (s.type === "hero" && s.variant !== "centered") || (s.type === "about" && s.variant !== "text") || s.type === "gallery";
      if (showsImage) visitImages(s.props);
      if (/replace this|your business|customer name|lorem ipsum|add your|example\.com|list the|describe your|explain your|share your/i.test(JSON.stringify(s.props))) placeholderText = true;
    }
  }
  if (sampleTestimonials) issues.push({ level: "warning", message: "Sample testimonials are still on the site. They are labelled \"Sample\" — replace them with real customer feedback, or remove the section." });
  if (placeholderText) issues.push({ level: "warning", message: "Some placeholder text is still on the site (for example \"hello@example.com\", \"Add your address here\" or \"Replace this…\"). Replace it with your real details." });
  if (missingImages) issues.push({ level: "info", message: `${missingImages} image slot${missingImages === 1 ? " has" : "s have"} no image. Empty slots show a soft colour block (empty gallery photos are left out).` });
  if (!hasContact) issues.push({ level: "info", message: "No contact details yet. Add an email, phone or address in a Contact section so visitors can reach you." });
  return issues;
}

function readme(doc: SiteDoc): string {
  const pages = doc.pages.map((p) => `  - ${pageFileName(p.slug)}  (${p.title})`).join("\n");
  return `${doc.name} — your website files
${"=".repeat(Math.min(60, doc.name.length + 24))}

Made with the ATITTLE Free AI Website Builder (https://atittle.com/free-website-builder).
These files are yours. They are plain HTML and CSS, with no ATITTLE code,
account, or subscription required.

WHAT IS IN THIS FOLDER
${pages}
  - assets/styles.css  (the design of every page)
  - assets/images/     (any images you uploaded)

TRY IT ON YOUR COMPUTER
  Double-click index.html. It opens in your web browser.

PUT IT ONLINE
You need web hosting (somewhere to store the files) and, if you want your own
address like www.yourbusiness.com, a domain name. Both are separate purchases
from a provider of your choice — ATITTLE does not sell or require either.

GoDaddy "Web Hosting" (cPanel) plans:
  1. Log in to GoDaddy > My Products > Web Hosting > Manage > cPanel Admin.
  2. Open "File Manager" and go into the "public_html" folder
     (for an extra domain, use that domain's own folder instead).
  3. Click "Upload" and upload ALL the files and folders from this folder,
     keeping the same structure (index.html must sit directly in public_html,
     next to the "assets" folder). Tip: upload this ZIP file and use
     File Manager's "Extract" option, then make sure index.html ended up
     directly in public_html and not inside an extra sub-folder.
  4. Make sure your domain points to this hosting (GoDaddy does this
     automatically for domains bought in the same account).
  5. In cPanel, open "SSL/TLS Status" and run AutoSSL so your site works on
     https://. This can take a few minutes.
  6. Visit your domain and click through every page.
  Note: GoDaddy's separate "Websites + Marketing" builder product cannot host
  uploaded files — you need a Web Hosting (cPanel) plan for these files.

Other good options (several have free plans for small static sites):
  - Netlify: drag this folder onto https://app.netlify.com/drop
  - Cloudflare Pages: Workers & Pages > Create > Pages > Upload assets
  - Hostinger, Bluehost, or any cPanel host: same steps as GoDaddy above

GOOD TO KNOW
  - Fonts load from Google Fonts, so pages need an internet connection to
    show the chosen fonts (they fall back to standard fonts otherwise).
  - Contact forms only work if you set a form service URL in the builder.
    Without one, the site shows your email, phone and WhatsApp links.
  - To change the site later, reopen your project in the builder on the same
    device/browser (or import your project backup file) and download again.

Full step-by-step guide: https://atittle.com/free-website-builder/hosting-guide
`;
}
