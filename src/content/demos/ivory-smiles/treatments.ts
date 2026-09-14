import { z } from "zod";

const treatmentSchema = z.object({
  id: z.string(),
  category: z.enum(["General", "Restorative", "Cosmetic", "Orthodontics", "Surgical"]),
  name: z.string(),
  description: z.string(),
  priceMinInr: z.number(),
  priceMaxInr: z.number(),
  priceUnit: z.string(),
  aftercare: z.string(),
});

export type Treatment = z.infer<typeof treatmentSchema>;

const raw: Treatment[] = [
  {
    id: "scaling-polishing",
    category: "General",
    name: "Scaling & Polishing",
    description: "Removes plaque and tartar buildup along the gumline, then polishes teeth smooth. Recommended every 6 months.",
    priceMinInr: 1200,
    priceMaxInr: 2500,
    priceUnit: "per session",
    aftercare: "Avoid very hot or cold food for 24 hours. Mild gum sensitivity for a day or two is normal.",
  },
  {
    id: "cavity-filling",
    category: "Restorative",
    name: "Cavity Filling (Composite)",
    description: "Tooth-coloured composite resin fills a cavity after removing decay, restoring shape and function in one visit.",
    priceMinInr: 800,
    priceMaxInr: 2000,
    priceUnit: "per tooth",
    aftercare: "Avoid chewing on the filled tooth for 2 hours. Some sensitivity to hot/cold for a few days is normal.",
  },
  {
    id: "root-canal",
    category: "Restorative",
    name: "Root Canal Treatment",
    description: "Removes infected pulp from inside a badly decayed or cracked tooth and seals it, usually over 1-2 sittings. A crown is recommended afterward to protect the tooth.",
    priceMinInr: 4000,
    priceMaxInr: 9000,
    priceUnit: "per tooth (crown extra)",
    aftercare: "Mild discomfort for 2-3 days is normal — take prescribed medication as directed. Avoid biting hard food on that side until the crown is placed.",
  },
  {
    id: "dental-crown",
    category: "Restorative",
    name: "Dental Crown (Ceramic/Zirconia)",
    description: "A custom-made cap that fully covers a damaged or root-canal-treated tooth, matched to your natural tooth colour.",
    priceMinInr: 5000,
    priceMaxInr: 15000,
    priceUnit: "per tooth",
    aftercare: "Avoid sticky or very hard foods for the first 48 hours while the cement fully sets.",
  },
  {
    id: "teeth-whitening",
    category: "Cosmetic",
    name: "Teeth Whitening (In-clinic)",
    description: "A single in-clinic session using a supervised whitening gel, typically lifting shade by 4-8 tones.",
    priceMinInr: 6000,
    priceMaxInr: 12000,
    priceUnit: "full treatment",
    aftercare: "Avoid tea, coffee, red wine and tobacco for 48 hours — pores in the enamel are more stain-prone right after whitening.",
  },
  {
    id: "clear-aligners",
    category: "Orthodontics",
    name: "Clear Aligners",
    description: "A series of custom, near-invisible aligner trays that gradually straighten teeth — usually worn 20-22 hours a day over 6-18 months.",
    priceMinInr: 35000,
    priceMaxInr: 90000,
    priceUnit: "full treatment",
    aftercare: "Clean aligners with a soft brush daily. Remove before eating or drinking anything except water.",
  },
  {
    id: "dental-implant",
    category: "Surgical",
    name: "Dental Implant (Single Tooth)",
    description: "A titanium post placed in the jawbone to replace a missing tooth root, topped with a crown once healed (usually 3-4 months).",
    priceMinInr: 25000,
    priceMaxInr: 45000,
    priceUnit: "per implant (crown extra)",
    aftercare: "Stick to soft food for a week. Avoid smoking during healing — it significantly slows implant integration.",
  },
  {
    id: "wisdom-tooth-extraction",
    category: "Surgical",
    name: "Wisdom Tooth Extraction",
    description: "Removal of an impacted or problematic wisdom tooth, done under local anaesthesia in most cases.",
    priceMinInr: 2500,
    priceMaxInr: 6000,
    priceUnit: "per tooth",
    aftercare: "Bite on gauze for 30-45 minutes after. Avoid rinsing forcefully, straws, or smoking for 24 hours to protect the healing clot.",
  },
];

export const treatments: Treatment[] = raw.map((t) => treatmentSchema.parse(t));
export const treatmentCategories = [...new Set(treatments.map((t) => t.category))];
