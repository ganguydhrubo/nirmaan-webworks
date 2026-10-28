/** Only known embed hosts and direct HTTPS MP4 files can become players. */
export function videoSource(raw: unknown): { kind: "embed" | "mp4"; src: string } | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (["vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)$/)?.[1];
      return id ? { kind: "embed", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    return /\.mp4$/i.test(url.pathname) ? { kind: "mp4", src: url.href } : null;
  } catch { return null; }
}
