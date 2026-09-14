import { z } from "zod";

const unitTypeSchema = z.object({
  config: z.string(), // e.g. "2 BHK"
  areaSqft: z.number(),
  priceMinInr: z.number(),
  priceMaxInr: z.number(),
  floorPlanRooms: z.array(z.object({ label: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
});

const projectSchema = z.object({
  slug: z.string(),
  name: z.string(),
  locality: z.string(),
  status: z.enum(["ready-to-move", "under-construction", "new-launch"]),
  configLabel: z.string(), // e.g. "2 & 3 BHK"
  budgetBand: z.enum(["under-60L", "60L-1Cr", "above-1Cr"]),
  possessionDate: z.string(),
  reraNumber: z.string(),
  totalUnits: z.number(),
  storeys: z.number(),
  description: z.string(),
  amenities: z.array(z.string()),
  locationAdvantages: z.array(z.string()),
  unitTypes: z.array(unitTypeSchema),
  heroTagline: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

const raw: Project[] = [
  {
    slug: "shivalik-meadows",
    name: "Shivalik Meadows",
    locality: "Sahastradhara Road, Dehradun",
    status: "under-construction",
    configLabel: "2 & 3 BHK",
    budgetBand: "60L-1Cr",
    possessionDate: "December 2027",
    reraNumber: "UKRERA-DDN-07-2025-00142 (demo placeholder)",
    totalUnits: 96,
    storeys: 8,
    description:
      "Eight-storey residences set back from Sahastradhara Road with a mountain-facing east block, built around a central landscaped courtyard. Shivalik Meadows is our flagship mid-rise project, aimed at families who want proximity to Rajpur Road schools without the traffic noise.",
    amenities: ["Landscaped central courtyard", "Clubhouse with indoor games room", "Covered car parking", "24x7 security with CCTV", "Rainwater harvesting", "Children's play area", "Backup power for common areas"],
    locationAdvantages: [
      "12 minutes to Rajpur Road school cluster",
      "8 minutes to Sahastradhara Road commercial stretch",
      "Direct approach road, no narrow lanes",
      "Close to Doon Hospital corridor for healthcare access",
    ],
    unitTypes: [
      {
        config: "2 BHK",
        areaSqft: 1050,
        priceMinInr: 5800000,
        priceMaxInr: 6400000,
        floorPlanRooms: [
          { label: "Living/Dining", x: 5, y: 5, w: 55, h: 45 },
          { label: "Master Bed", x: 65, y: 5, w: 30, h: 30 },
          { label: "Bed 2", x: 65, y: 40, w: 30, h: 25 },
          { label: "Kitchen", x: 5, y: 55, w: 25, h: 25 },
          { label: "Bath", x: 35, y: 55, w: 20, h: 25 },
          { label: "Balcony", x: 5, y: 85, w: 90, h: 10 },
        ],
      },
      {
        config: "3 BHK",
        areaSqft: 1420,
        priceMinInr: 7800000,
        priceMaxInr: 8900000,
        floorPlanRooms: [
          { label: "Living/Dining", x: 5, y: 5, w: 50, h: 40 },
          { label: "Master Bed", x: 60, y: 5, w: 35, h: 28 },
          { label: "Bed 2", x: 60, y: 38, w: 35, h: 22 },
          { label: "Bed 3", x: 5, y: 50, w: 30, h: 25 },
          { label: "Kitchen", x: 40, y: 50, w: 20, h: 25 },
          { label: "Bath", x: 60, y: 65, w: 15, h: 20 },
          { label: "Balcony", x: 5, y: 80, w: 90, h: 15 },
        ],
      },
    ],
    heroTagline: "Mountain-facing homes on Sahastradhara Road",
  },
  {
    slug: "shivalik-ridge-residences",
    name: "Shivalik Ridge Residences",
    locality: "Clement Town, Dehradun",
    status: "ready-to-move",
    configLabel: "3 BHK",
    budgetBand: "60L-1Cr",
    possessionDate: "Ready to move",
    reraNumber: "UKRERA-DDN-07-2022-00098 (demo placeholder)",
    totalUnits: 48,
    storeys: 6,
    description:
      "Our first completed project, handed over in 2023 — six low-rise blocks around a shared lawn near Clement Town, close to IMA and the cantonment area. Popular with defence families and second-home buyers wanting a quieter part of the city.",
    amenities: ["Shared lawn and walking track", "Community hall", "Covered parking", "Solar water heating", "24x7 security"],
    locationAdvantages: ["6 minutes to IMA", "Quiet cantonment-adjacent locality", "Low-density, low-rise layout", "10 minutes to Clement Town market"],
    unitTypes: [
      {
        config: "3 BHK",
        areaSqft: 1380,
        priceMinInr: 7200000,
        priceMaxInr: 7900000,
        floorPlanRooms: [
          { label: "Living/Dining", x: 5, y: 5, w: 55, h: 42 },
          { label: "Master Bed", x: 65, y: 5, w: 30, h: 28 },
          { label: "Bed 2", x: 65, y: 36, w: 30, h: 22 },
          { label: "Bed 3", x: 5, y: 50, w: 30, h: 25 },
          { label: "Kitchen", x: 40, y: 50, w: 20, h: 25 },
          { label: "Bath", x: 65, y: 61, w: 15, h: 18 },
          { label: "Balcony", x: 5, y: 78, w: 90, h: 17 },
        ],
      },
    ],
    heroTagline: "Ready-to-move homes near Clement Town",
  },
  {
    slug: "shivalik-vista",
    name: "Shivalik Vista",
    locality: "Rajpur Road Extension, Dehradun",
    status: "new-launch",
    configLabel: "3 & 4 BHK",
    budgetBand: "above-1Cr",
    possessionDate: "March 2029",
    reraNumber: "UKRERA-DDN-07-2026-00061 (demo placeholder)",
    totalUnits: 64,
    storeys: 10,
    description:
      "Our newest launch — ten-storey premium residences on Rajpur Road Extension with valley-facing balconies on every unit. Larger format homes for buyers upgrading from an independent house or a smaller flat elsewhere in the city.",
    amenities: ["Valley-facing balconies", "Rooftop lounge", "Gym and yoga deck", "Double-height entrance lobby", "EV charging points", "Landscaped podium garden", "24x7 security with video intercom"],
    locationAdvantages: ["5 minutes to Rajpur Road cafes and retail", "15 minutes to Dehradun Railway Station", "Close to top-rated schools", "Valley and hill views from upper floors"],
    unitTypes: [
      {
        config: "3 BHK",
        areaSqft: 1650,
        priceMinInr: 10500000,
        priceMaxInr: 11800000,
        floorPlanRooms: [
          { label: "Living/Dining", x: 5, y: 5, w: 55, h: 40 },
          { label: "Master Bed", x: 62, y: 5, w: 33, h: 26 },
          { label: "Bed 2", x: 62, y: 33, w: 33, h: 22 },
          { label: "Bed 3", x: 5, y: 47, w: 32, h: 25 },
          { label: "Kitchen", x: 39, y: 47, w: 18, h: 25 },
          { label: "Bath", x: 62, y: 57, w: 15, h: 18 },
          { label: "Balcony", x: 5, y: 76, w: 90, h: 19 },
        ],
      },
      {
        config: "4 BHK",
        areaSqft: 2100,
        priceMinInr: 13800000,
        priceMaxInr: 15900000,
        floorPlanRooms: [
          { label: "Living/Dining", x: 5, y: 5, w: 50, h: 35 },
          { label: "Master Bed", x: 58, y: 5, w: 37, h: 24 },
          { label: "Bed 2", x: 58, y: 31, w: 37, h: 20 },
          { label: "Bed 3", x: 5, y: 42, w: 28, h: 22 },
          { label: "Bed 4", x: 35, y: 42, w: 20, h: 22 },
          { label: "Kitchen", x: 58, y: 53, w: 20, h: 20 },
          { label: "Bath", x: 5, y: 66, w: 15, h: 15 },
          { label: "Balcony", x: 5, y: 83, w: 90, h: 12 },
        ],
      },
    ],
    heroTagline: "Valley-facing premium homes, launching soon",
  },
];

export const projects: Project[] = raw.map((p) => projectSchema.parse(p));
export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
