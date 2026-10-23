export interface CuratedPhoto {
  id: string;
  label: string;
  category: "Festive & Retail" | "Healthcare" | "Food & Dining" | "Real Estate" | "Salon & Style" | "Corporate & Tech";
  tags: string[];
  url: string;
}

export interface CuratedIcon {
  id: string;
  label: string;
  category: "Business" | "Commerce" | "Interface" | "Badges";
  svgPath: string;
  viewBox: string;
}

export const CURATED_PHOTOS: CuratedPhoto[] = [
  // 1. Festive & Retail
  {
    id: "p-festive-diyas",
    label: "Golden Diwali Diyas & Sparklers",
    category: "Festive & Retail",
    tags: ["diwali", "festival", "gold", "light", "diya", "celebration", "sale"],
    url: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-festive-jewellery",
    label: "Royal Kundan & Polki Bridal Gold",
    category: "Festive & Retail",
    tags: ["jewellery", "gold", "necklace", "bridal", "luxury", "wedding", "kundan"],
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-festive-saree",
    label: "Banarasi Silk Saree Weaves",
    category: "Festive & Retail",
    tags: ["fashion", "saree", "silk", "boutique", "textiles", "wedding", "apparel"],
    url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-festive-sweets",
    label: "Traditional Mithai & Indian Sweets Box",
    category: "Festive & Retail",
    tags: ["sweets", "mithai", "gift", "laddu", "celebration", "festive"],
    url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-festive-gifts",
    label: "Festive Luxury Gift Hampers",
    category: "Festive & Retail",
    tags: ["gift", "hamper", "box", "offer", "discount", "shopping"],
    url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-retail-boutique",
    label: "Modern Fashion Apparel Boutique",
    category: "Festive & Retail",
    tags: ["retail", "boutique", "fashion", "clothing", "shopping", "store"],
    url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
  },

  // 2. Healthcare & Clinic
  {
    id: "p-health-clinic-consult",
    label: "Doctor Desk & Patient Consultation",
    category: "Healthcare",
    tags: ["doctor", "clinic", "consultation", "medical", "checkup", "hospital"],
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-health-dental",
    label: "Modern Dental Clinic Chair & Care",
    category: "Healthcare",
    tags: ["dental", "dentist", "teeth", "smile", "clinic", "health"],
    url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-health-stethoscope",
    label: "Clinical Stethoscope & Vitals",
    category: "Healthcare",
    tags: ["stethoscope", "medicine", "doctor", "heart", "health", "care"],
    url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-health-pharmacy",
    label: "Pharmacy Store & Prescriptions",
    category: "Healthcare",
    tags: ["pharmacy", "medicine", "chemists", "medicines", "pills"],
    url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-health-wellness",
    label: "Physiotherapy & Holistic Rehab",
    category: "Healthcare",
    tags: ["wellness", "physio", "therapy", "rehab", "fitness", "care"],
    url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
  },

  // 3. Food & Dining
  {
    id: "p-food-biryani",
    label: "Royal Dum Gosht Biryani Handi",
    category: "Food & Dining",
    tags: ["biryani", "food", "restaurant", "chicken", "spices", "dinner", "feast"],
    url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-food-kebabs",
    label: "Sizzling Tandoori Platter & Kebabs",
    category: "Food & Dining",
    tags: ["kebabs", "tandoori", "starter", "chicken", "bbq", "dining"],
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-food-thali",
    label: "Traditional Authentic Indian Thali",
    category: "Food & Dining",
    tags: ["thali", "veg", "curry", "roti", "paneer", "meal", "lunch"],
    url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-food-cafe",
    label: "Artisanal Coffee & Cafe Bistro",
    category: "Food & Dining",
    tags: ["cafe", "coffee", "latte", "breakfast", "bistro", "pastry"],
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-food-dessert",
    label: "Gourmet Dessert & Pastry Cake",
    category: "Food & Dining",
    tags: ["dessert", "cake", "bakery", "sweet", "chocolate", "pastry"],
    url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
  },

  // 4. Real Estate & Architecture
  {
    id: "p-re-villa",
    label: "Contemporary Luxury Villa & Pool",
    category: "Real Estate",
    tags: ["villa", "real estate", "luxury", "home", "property", "pool", "builder"],
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-re-penthouse",
    label: "High-Rise Skyline Penthouse Living",
    category: "Real Estate",
    tags: ["penthouse", "apartment", "interior", "living room", "flat", "city"],
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-re-interior",
    label: "Minimalist Architectural Interior",
    category: "Real Estate",
    tags: ["interior", "architecture", "decor", "design", "furniture", "modern"],
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-re-construction",
    label: "Commercial Development & Building",
    category: "Real Estate",
    tags: ["building", "construction", "commercial", "property", "tower"],
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  },

  // 5. Salon & Lifestyle
  {
    id: "p-salon-bridal",
    label: "Bridal Studio Makeup & Hair",
    category: "Salon & Style",
    tags: ["makeup", "bridal", "beauty", "salon", "hair", "spa", "makeover"],
    url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-salon-spa",
    label: "Serene Ayurvedic Wellness Spa",
    category: "Salon & Style",
    tags: ["spa", "massage", "ayurveda", "wellness", "relaxation", "skin"],
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-fitness-gym",
    label: "High-Performance Training & Gym",
    category: "Salon & Style",
    tags: ["gym", "fitness", "workout", "training", "weights", "crossfit"],
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-craft-ceramics",
    label: "Artisanal Studio Handcrafted Pottery",
    category: "Salon & Style",
    tags: ["ceramics", "pottery", "artisan", "handmade", "workshop", "craft"],
    url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
  },

  // 6. Corporate & Tech
  {
    id: "p-corp-office",
    label: "Collaborative Modern Studio Office",
    category: "Corporate & Tech",
    tags: ["office", "workspace", "startup", "team", "agency", "tech"],
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-corp-laptop",
    label: "Minimal Laptop Design Workstation",
    category: "Corporate & Tech",
    tags: ["laptop", "desk", "computer", "code", "design", "business"],
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
  },
];

export const CURATED_ICONS: CuratedIcon[] = [
  {
    id: "ic-whatsapp",
    label: "WhatsApp Chat",
    category: "Business",
    viewBox: "0 0 24 24",
    svgPath: "M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z",
  },
  {
    id: "ic-phone",
    label: "Telephone Call",
    category: "Business",
    viewBox: "0 0 24 24",
    svgPath: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  },
  {
    id: "ic-pin",
    label: "Location Pin",
    category: "Business",
    viewBox: "0 0 24 24",
    svgPath: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    id: "ic-mail",
    label: "Email Envelope",
    category: "Business",
    viewBox: "0 0 24 24",
    svgPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  },
  {
    id: "ic-star",
    label: "Five-Point Star",
    category: "Badges",
    viewBox: "0 0 24 24",
    svgPath: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  {
    id: "ic-badge-check",
    label: "Verified Quality Shield",
    category: "Badges",
    viewBox: "0 0 24 24",
    svgPath: "M12 2l3 2 4-1 1 4 3 2-2 4 2 4-3 2-1 4-4-1-3 2-3-2-4 1-1-4-3-2 2-4-2-4 3-2 1-4 4 1 3-2z M9 12l2 2 4-4",
  },
  {
    id: "ic-rupee",
    label: "Indian Rupee (₹)",
    category: "Commerce",
    viewBox: "0 0 24 24",
    svgPath: "M6 3h12M6 8h12M6 13h5a4 4 0 0 0 0-8M14 13l-7 8",
  },
  {
    id: "ic-shopping-bag",
    label: "Shopping Bag",
    category: "Commerce",
    viewBox: "0 0 24 24",
    svgPath: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  },
  {
    id: "ic-tag",
    label: "Discount Offer Tag",
    category: "Commerce",
    viewBox: "0 0 24 24",
    svgPath: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  },
  {
    id: "ic-clock",
    label: "Timings / Hours",
    category: "Interface",
    viewBox: "0 0 24 24",
    svgPath: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  },
  {
    id: "ic-shield",
    label: "Security & BIS Guarantee",
    category: "Badges",
    viewBox: "0 0 24 24",
    svgPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    id: "ic-crown",
    label: "Royal Luxury Crown",
    category: "Badges",
    viewBox: "0 0 24 24",
    svgPath: "M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z M3 20h18v2H3z",
  },
  {
    id: "ic-diamond",
    label: "Precious Diamond",
    category: "Badges",
    viewBox: "0 0 24 24",
    svgPath: "M6 3h12l4 6-10 12L2 9z M6 3l4 6 2-6 M18 3l-4 6-2-6 M2 9h20 M12 21L8 9 M12 21l4-12",
  },
  {
    id: "ic-zap",
    label: "Lightning Zap",
    category: "Interface",
    viewBox: "0 0 24 24",
    svgPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  {
    id: "ic-building",
    label: "Architectural Tower",
    category: "Business",
    viewBox: "0 0 24 24",
    svgPath: "M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18 M9 18h6 M9 14h6 M9 10h6 M9 6h6",
  },
  {
    id: "ic-utensils",
    label: "Dining & Bistro",
    category: "Commerce",
    viewBox: "0 0 24 24",
    svgPath: "M18 2v20 M18 2a4 4 0 0 1 4 4v4h-4 M6 2v20 M6 2v6a3 3 0 0 0 6 0V2 M9 8v14",
  },
  {
    id: "ic-heart",
    label: "Favorite Love",
    category: "Interface",
    viewBox: "0 0 24 24",
    svgPath: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  },
];
