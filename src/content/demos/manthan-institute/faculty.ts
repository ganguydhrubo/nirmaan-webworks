import { z } from "zod";

const facultySchema = z.object({
  slug: z.string(),
  name: z.string(),
  subject: z.string(),
  qualification: z.string(),
  experienceYears: z.number(),
  bio: z.string(),
  initials: z.string(),
});

export type Faculty = z.infer<typeof facultySchema>;

const raw: Faculty[] = [
  {
    slug: "rajendra-sharma",
    name: "Dr. Rajendra Sharma",
    subject: "Physics",
    qualification: "Ph.D. (Physics), MNIT Jaipur",
    experienceYears: 18,
    bio: "Eighteen years teaching JEE and NEET Physics in Kota. Known for breaking mechanics and electrodynamics down into a handful of core patterns students can actually recall under exam pressure.",
    initials: "RS",
  },
  {
    slug: "kavita-bhandari",
    name: "Kavita Bhandari",
    subject: "Chemistry",
    qualification: "M.Sc. Chemistry, BITS Pilani",
    experienceYears: 12,
    bio: "Specialises in Organic Chemistry reaction mechanisms. Runs the Sunday doubt-clearing sessions that most students say are the single most useful hour of their week.",
    initials: "KB",
  },
  {
    slug: "anil-choudhary",
    name: "Anil Choudhary",
    subject: "Mathematics",
    qualification: "M.Sc. Mathematics, University of Rajasthan",
    experienceYears: 15,
    bio: "Focuses on JEE Advanced-level problem-solving — coordinate geometry and calculus in particular. Sets a fresh problem set every single week, never recycled.",
    initials: "AC",
  },
  {
    slug: "priya-nair",
    name: "Dr. Priya Nair",
    subject: "Biology",
    qualification: "Ph.D. (Zoology)",
    experienceYears: 10,
    bio: "Ten years teaching NEET Biology with a diagram-first method — students redraw and label every major diagram from memory before moving to the next chapter.",
    initials: "PN",
  },
  {
    slug: "vikram-singh-rathore",
    name: "Vikram Singh Rathore",
    subject: "Physics (Foundation, Class 9–10)",
    qualification: "B.Tech, IIT Delhi",
    experienceYears: 8,
    bio: "Teaches the Foundation batch — builds conceptual habits early so the jump to JEE/NEET-level Physics in Class 11 doesn't feel like a cliff.",
    initials: "VR",
  },
];

export const faculty: Faculty[] = raw.map((r) => facultySchema.parse(r));
