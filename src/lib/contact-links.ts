import { siteConfig } from "@config/site";

/** The ONLY place wa.me / tel: / mailto: URLs are constructed. */
export function waLink(message: string): string {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function telLink(): string {
  return `tel:${siteConfig.phoneE164}`;
}

export function mailLink(subject?: string): string {
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${siteConfig.primaryEmail}${q}`;
}
