import { z } from "zod";

const dentistSchema = z.object({
  slug: z.string(),
  name: z.string(),
  role: z.string(),
  qualification: z.string(),
  registration: z.string(),
  experienceYears: z.number(),
  focusAreas: z.array(z.string()).min(2),
  bio: z.string(),
  philosophy: z.string(),
  initials: z.string(),
  accent: z.enum(["ivory-500", "ivory-coral"]),
});

export type Dentist = z.infer<typeof dentistSchema>;

const raw: Dentist[] = [
  {
    slug: "ananya-rathi",
    name: "Dr. Ananya Rathi",
    role: "Founder & Chief Prosthodontist",
    qualification: "BDS, MDS (Prosthodontics & Crown and Bridge)",
    registration: "Madhya Pradesh Dental Council Reg. No. MPDC-4471",
    experienceYears: 14,
    focusAreas: ["Dental implants", "Crowns & bridges", "Full-mouth rehabilitation"],
    bio: "Dr. Rathi founded Ivory Smiles in 2014 after seven years of hospital-based prosthodontic practice in Bhopal. She has since placed over 900 dental implants and rebuilt full smiles for patients who had been told by other clinics that nothing more could be done.",
    philosophy: "A treatment plan should fit the patient in front of me, not the other way around. I'd rather spend twenty extra minutes explaining options than have someone leave confused about what they agreed to.",
    initials: "AR",
    accent: "ivory-500",
  },
  {
    slug: "karan-mehta",
    name: "Dr. Karan Mehta",
    role: "Cosmetic & Orthodontic Dentist",
    qualification: "BDS, PG Certification in Clear Aligner Therapy (Invisalign-trained)",
    registration: "Madhya Pradesh Dental Council Reg. No. MPDC-5820",
    experienceYears: 7,
    focusAreas: ["Clear aligners", "Teeth whitening", "Cosmetic bonding"],
    bio: "Dr. Mehta joined Ivory Smiles in 2019 and runs the clinic's orthodontics and cosmetic practice. He plans every aligner case personally using digital scans rather than physical moulds, and reviews progress every 6 weeks.",
    philosophy: "Most adults who need braces avoid treatment for years because they don't want metal brackets at work. My job is to make that decision easy — clear trays, a realistic timeline, and no surprises at the review appointment.",
    initials: "KM",
    accent: "ivory-coral",
  },
];

export const dentists: Dentist[] = raw.map((d) => dentistSchema.parse(d));
