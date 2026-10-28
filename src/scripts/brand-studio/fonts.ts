/** One allowlist shared by the picker, stage and raster exporter. */
export const GOOGLE_FONTS = [
  "Inter", "Poppins", "Montserrat", "Playfair Display", "Oswald", "Dancing Script",
  "Pacifico", "Cinzel", "Space Grotesk", "Plus Jakarta Sans", "DM Sans", "Fraunces",
  "Bebas Neue", "Merriweather", "Lora", "Caveat", "Satisfy", "Abril Fatface", "Outfit",
  "Syne", "Manrope", "Roboto", "Open Sans", "Lato", "Raleway", "Nunito", "Rubik",
  "Work Sans", "Barlow", "Quicksand", "Karla", "Archivo", "Figtree", "Urbanist",
  "Libre Baskerville", "Cormorant Garamond", "DM Serif Display", "Prata", "Bodoni Moda",
  "Josefin Sans", "Anton", "Righteous", "Sacramento", "Great Vibes", "Noto Sans Bengali",
  "Noto Sans Devanagari",
] as const;

const requests = new Map<string, Promise<void>>();
const displayFaces = new Set(["Pacifico", "Bebas Neue", "Satisfy", "Abril Fatface", "DM Serif Display", "Prata", "Anton", "Righteous", "Sacramento", "Great Vibes"]);
export function loadStudioFont(family: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const name = family.split(",")[0]?.trim().replace(/["']/g, "") || "Inter";
  if (!(GOOGLE_FONTS as readonly string[]).includes(name)) return Promise.resolve();
  if (requests.has(name)) return requests.get(name)!;
  const id = `studio-font-${name.replace(/ /g, "-")}`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (link) return Promise.resolve();
  link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  const weights = displayFaces.has(name) ? "" : ":wght@400;700";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}${weights}&display=swap`;
  const promise = new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 8000);
    link!.onload = () => { window.clearTimeout(timer); resolve(); };
    link!.onerror = () => { window.clearTimeout(timer); resolve(); };
    document.head.appendChild(link!);
  });
  requests.set(name, promise);
  return promise;
}
