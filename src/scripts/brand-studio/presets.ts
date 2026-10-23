import type { CanvasPreset, BrandPalette } from "./types";

export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: "insta-square",
    name: "Instagram Post (Square)",
    width: 1080,
    height: 1080,
    category: "Social",
    badge: "1:1",
    icon: "square",
  },
  {
    id: "whatsapp-story",
    name: "WhatsApp Status & Story",
    width: 1080,
    height: 1920,
    category: "Social",
    badge: "9:16",
    icon: "smartphone",
  },
  {
    id: "insta-portrait",
    name: "Instagram Portrait Post",
    width: 1080,
    height: 1350,
    category: "Social",
    badge: "4:5",
    icon: "image",
  },
  {
    id: "youtube-landscape",
    name: "Banner & Landscape Ad",
    width: 1280,
    height: 720,
    category: "Marketing",
    badge: "16:9",
    icon: "monitor",
  },
  {
    id: "business-card",
    name: "Visiting Card (Print)",
    width: 1050,
    height: 600,
    category: "Print",
    badge: "3.5:2",
    icon: "credit-card",
  },
  {
    id: "a4-flyer",
    name: "A4 Flyer / Menu / Catalog",
    width: 1240,
    height: 1754,
    category: "Print",
    badge: "A4 Print",
    icon: "file-text",
  },
  {
    id: "promo-banner",
    name: "Offer Banner (Meta Ad)",
    width: 1200,
    height: 630,
    category: "Marketing",
    badge: "1.91:1",
    icon: "layout",
  },
  {
    id: "logo-design",
    name: "Logo Design (Vector)",
    width: 800,
    height: 800,
    category: "Digital",
    badge: "Brand Identity",
    icon: "shield",
  },
  {
    id: "product-badge",
    name: "Product Showcase Card",
    width: 800,
    height: 800,
    category: "Digital",
    badge: "Compact",
    icon: "shopping-bag",
  },
];

export const BRAND_PALETTES: BrandPalette[] = [
  {
    id: "atittle-luxury",
    name: "ATITTLE Luxury Signature",
    colors: ["#1c1917", "#fbf6ee", "#c85a32", "#d4af37", "#292524", "#e7e5e4"],
  },
  {
    id: "festive-gold",
    name: "Royal Festive & Bridal",
    colors: ["#7f1d1d", "#d97706", "#fef3c7", "#f59e0b", "#450a0a", "#fefce8"],
  },
  {
    id: "clinical-clean",
    name: "Healthcare & Clinic Care",
    colors: ["#0f172a", "#0284c7", "#e0f2fe", "#059669", "#f8fafc", "#334155"],
  },
  {
    id: "boutique-rose",
    name: "Boutique & Salon Rose",
    colors: ["#831843", "#f43f5e", "#ffe4e6", "#fda4af", "#2e1065", "#fff1f2"],
  },
  {
    id: "spice-terracotta",
    name: "Culinary & Restaurant Feast",
    colors: ["#7c2d12", "#ea580c", "#ffedd5", "#fb923c", "#18181b", "#fff7ed"],
  },
  {
    id: "enterprise-navy",
    name: "Corporate & Real Estate",
    colors: ["#1e293b", "#0f766e", "#f0fdfa", "#3b82f6", "#020617", "#f1f5f9"],
  },
];

export const STOCK_CURATED_PHOTOS = [
  {
    id: "photo-jewellery",
    label: "Bridal Jewellery Luxury",
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    category: "Retail",
  },
  {
    id: "photo-food",
    label: "Gourmet Dining Cuisine",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    category: "Hospitality",
  },
  {
    id: "photo-clinic",
    label: "Modern Clinic Consultation",
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
    category: "Health",
  },
  {
    id: "photo-realestate",
    label: "Architectural Villa Penthouse",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    category: "Real Estate",
  },
  {
    id: "photo-fashion",
    label: "Artisanal Silk Boutique",
    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    category: "Retail",
  },
  {
    id: "photo-ceramics",
    label: "Handmade Ceramic Studio",
    url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
    category: "Craft",
  },
];
