import { z } from "zod";

const courseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  exam: z.enum(["JEE", "NEET", "Foundation"]),
  eligibility: z.string(),
  subjects: z.array(z.string()).min(1),
  durationLabel: z.string(),
  feeInr: z.number(),
  feeNote: z.string(),
  covers: z.array(z.string()).min(3),
  batches: z.array(z.object({ name: z.string(), days: z.string(), time: z.string() })).min(1),
  syllabusUnits: z.array(z.object({ subject: z.string(), units: z.array(z.string()).min(1) })).min(1),
});

export type Course = z.infer<typeof courseSchema>;

// Reusable syllabus unit lists — kept here once and composed per course below
// so the two-year, one-year and crash-course variants of the same subject
// stay consistent with each other.
const physicsClass11 = [
  "Units, Measurement & Dimensional Analysis",
  "Kinematics — motion in a straight line and a plane",
  "Laws of Motion & Friction",
  "Work, Energy and Power",
  "Rotational Motion & Rigid Body Dynamics",
  "Gravitation",
  "Mechanical Properties of Solids & Fluids",
  "Thermodynamics & Kinetic Theory of Gases",
  "Oscillations and Waves",
];
const physicsClass12 = [
  "Electrostatics",
  "Current Electricity",
  "Magnetic Effects of Current & Magnetism",
  "Electromagnetic Induction & Alternating Current",
  "Ray Optics and Wave Optics",
  "Modern Physics — Dual Nature, Atoms & Nuclei",
  "Semiconductor Electronics",
];
const chemistryClass11 = [
  "Basic Concepts of Chemistry & Mole Concept",
  "Atomic Structure",
  "Chemical Bonding & Molecular Structure",
  "States of Matter & Chemical Equilibrium",
  "Thermodynamics & Redox Reactions",
  "Organic Chemistry — Basic Principles & Hydrocarbons",
];
const chemistryClass12 = [
  "Solid State & Solutions",
  "Electrochemistry & Chemical Kinetics",
  "p-Block, d-Block and f-Block Elements",
  "Coordination Compounds",
  "Haloalkanes, Alcohols, Phenols & Ethers",
  "Aldehydes, Ketones, Carboxylic Acids & Amines",
  "Biomolecules & Polymers",
];
const mathClass11 = [
  "Sets, Relations and Functions",
  "Trigonometric Functions & Equations",
  "Complex Numbers & Quadratic Equations",
  "Sequences, Series and the Binomial Theorem",
  "Straight Lines & Conic Sections",
  "Limits, Continuity and an Introduction to Derivatives",
  "Permutations, Combinations and Probability",
];
const mathClass12 = [
  "Matrices and Determinants",
  "Continuity, Differentiability and Applications of Derivatives",
  "Integrals and Applications of Integrals",
  "Differential Equations",
  "Vectors and Three-Dimensional Geometry",
  "Probability, including Conditional Probability and Bayes' Theorem",
];
const biologyClass11 = [
  "Diversity of Living Organisms",
  "Structural Organisation in Animals and Plants",
  "Cell Structure and Function",
  "Plant Physiology",
  "Human Physiology — Digestion, Respiration and Circulation",
];
const biologyClass12 = [
  "Reproduction in Organisms",
  "Genetics and Evolution",
  "Human Health and Disease",
  "Biotechnology and Its Applications",
  "Ecology and Environment",
];
const physicsRevision = [
  "Mechanics — full revision with previous years' problem patterns",
  "Electrodynamics — Electrostatics through EMI/AC, revised as one connected unit",
  "Optics and Modern Physics — high-frequency exam topics first",
  "Heat, Thermodynamics and Waves — quick-reference revision",
];
const chemistryRevision = [
  "Physical Chemistry — Mole Concept through Electrochemistry, formula-first revision",
  "Inorganic Chemistry — periodic trends and block-wise recall practice",
  "Organic Chemistry — reaction mechanisms and named-reaction revision",
];
const mathRevision = [
  "Algebra and Coordinate Geometry — full revision",
  "Calculus — Limits through Differential Equations, problem-pattern revision",
  "Vectors, Three-Dimensional Geometry and Probability — quick-reference revision",
];
const biologyRevision = [
  "Botany — Plant Physiology through Ecology, NCERT-line revision",
  "Zoology — Human Physiology through Human Health and Disease",
  "Genetics and Evolution — diagram- and terminology-focused revision",
];
const physicsCrash = [
  "Highest-weightage chapters only: Mechanics, Electrodynamics, Modern Physics",
  "Formula-sheet revision followed by rapid-fire numerical practice",
];
const chemistryCrash = [
  "NCERT line-by-line revision for Inorganic Chemistry",
  "Named reactions and mechanism revision for Organic Chemistry",
];
const mathOrBioCrash = [
  "Mathematics: previous 10 years' most-repeated JEE question types",
  "Biology: NCERT diagram and one-line-answer revision for NEET droppers",
];
const foundationScience = [
  "CBSE board syllabus for Physics, Chemistry and Biology, taught with concept maps rather than rote notes",
  "Early, low-pressure exposure to olympiad and NTSE-style reasoning problems",
  "Weekly practice sheets that build steadily toward Class 11 pace",
];
const foundationMath = [
  "CBSE board syllabus for Mathematics with an emphasis on applied problem-solving",
  "Early groundwork in coordinate geometry and trigonometry ahead of Class 11",
];

const raw: Course[] = [
  {
    slug: "jee-two-year-foundation",
    name: "JEE Main & Advanced — Two-Year Foundation",
    exam: "JEE",
    eligibility: "Class 10 pass / entering Class 11",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    durationLabel: "2 years (Class 11 & 12)",
    feeInr: 185000,
    feeNote: "includes study material and full test series for both years",
    covers: [
      "NCERT-to-JEE-Advanced bridge for all three subjects",
      "Concept-building through Class 11, problem-solving intensity through Class 12",
      "Weekly topic tests + monthly full-syllabus tests from Class 12 onward",
      "Doubt-clearing sessions every Sunday",
    ],
    batches: [
      { name: "Morning Batch", days: "Mon–Sat", time: "6:30 AM – 9:30 AM" },
      { name: "Evening Batch", days: "Mon–Sat", time: "4:30 PM – 7:30 PM" },
    ],
    syllabusUnits: [
      { subject: "Physics", units: [...physicsClass11, ...physicsClass12] },
      { subject: "Chemistry", units: [...chemistryClass11, ...chemistryClass12] },
      { subject: "Mathematics", units: [...mathClass11, ...mathClass12] },
    ],
  },
  {
    slug: "jee-target-batch",
    name: "JEE Main & Advanced — One-Year Target Batch",
    exam: "JEE",
    eligibility: "Class 12 students and droppers",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    durationLabel: "1 year",
    feeInr: 125000,
    feeNote: "includes study material and full test series",
    covers: [
      "Complete Class 12 syllabus revision aligned to the JEE pattern",
      "Previous 15 years' JEE Main & Advanced question-bank practice",
      "Full-length mock tests every Sunday from month 3 onward",
      "Rank-improvement strategy sessions in the final 60 days",
    ],
    batches: [{ name: "Day Batch (full-time)", days: "Mon–Sat", time: "9:30 AM – 4:30 PM" }],
    syllabusUnits: [
      { subject: "Physics", units: physicsRevision },
      { subject: "Chemistry", units: chemistryRevision },
      { subject: "Mathematics", units: mathRevision },
    ],
  },
  {
    slug: "neet-two-year-foundation",
    name: "NEET — Two-Year Foundation",
    exam: "NEET",
    eligibility: "Class 10 pass / entering Class 11",
    subjects: ["Physics", "Chemistry", "Biology"],
    durationLabel: "2 years (Class 11 & 12)",
    feeInr: 175000,
    feeNote: "includes study material and full test series for both years",
    covers: [
      "NCERT-first approach — NEET is an NCERT-heavy exam and we teach it that way",
      "Diagram-based Biology practice with weekly labelling tests",
      "Physics and Chemistry numerical practice aligned to NEET's exact difficulty band",
      "Monthly full-syllabus NEET-pattern tests from Class 12 onward",
    ],
    batches: [
      { name: "Morning Batch", days: "Mon–Sat", time: "6:30 AM – 9:30 AM" },
      { name: "Evening Batch", days: "Mon–Sat", time: "4:30 PM – 7:30 PM" },
    ],
    syllabusUnits: [
      { subject: "Physics", units: [...physicsClass11, ...physicsClass12] },
      { subject: "Chemistry", units: [...chemistryClass11, ...chemistryClass12] },
      { subject: "Biology", units: [...biologyClass11, ...biologyClass12] },
    ],
  },
  {
    slug: "neet-target-batch",
    name: "NEET — One-Year Target Batch",
    exam: "NEET",
    eligibility: "Class 12 students and droppers",
    subjects: ["Physics", "Chemistry", "Biology"],
    durationLabel: "1 year",
    feeInr: 115000,
    feeNote: "includes study material and full test series",
    covers: [
      "Full Class 11 & 12 NCERT revision compressed into a structured yearly plan",
      "Previous 15 years' NEET question-bank practice, subject-wise and full-length",
      "Weekly Biology diagram and terminology tests",
      "All-India-pattern mock tests every Sunday from month 3 onward",
    ],
    batches: [{ name: "Day Batch (full-time)", days: "Mon–Sat", time: "9:30 AM – 4:30 PM" }],
    syllabusUnits: [
      { subject: "Physics", units: physicsRevision },
      { subject: "Chemistry", units: chemistryRevision },
      { subject: "Biology", units: biologyRevision },
    ],
  },
  {
    slug: "foundation-9-10",
    name: "Foundation Course — Class 9 & 10",
    exam: "Foundation",
    eligibility: "Class 8 pass / entering Class 9 or 10",
    subjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
    durationLabel: "1 year (renewable)",
    feeInr: 65000,
    feeNote: "per academic year",
    covers: [
      "Board-syllabus mastery alongside early olympiad and NTSE-style problem exposure",
      "Habit-building: daily practice sheets and weekly concept tests",
      "Early orientation to JEE/NEET question formats without added pressure",
      "Parent-teacher progress calls every month",
    ],
    batches: [{ name: "Evening Batch", days: "Mon–Sat", time: "5:00 PM – 7:00 PM" }],
    syllabusUnits: [
      { subject: "Physics & Chemistry", units: foundationScience },
      { subject: "Mathematics", units: foundationMath },
      {
        subject: "Biology",
        units: [
          "CBSE board syllabus for Biology with diagram-labelling practice",
          "Early introduction to NEET-style diagram-based questions",
        ],
      },
    ],
  },
  {
    slug: "crash-course",
    name: "45-Day Crash Course (JEE/NEET)",
    exam: "JEE",
    eligibility: "Students who have completed the Class 12 syllabus and want intensive pre-exam revision",
    subjects: ["Physics", "Chemistry", "Mathematics / Biology"],
    durationLabel: "45 days",
    feeInr: 35000,
    feeNote: "flat fee, includes revision material",
    covers: [
      "High-yield topic revision only — no new concepts introduced",
      "One full-length mock test every alternate day",
      "Error-log review sessions to fix repeated mistakes before the exam",
      "Exam-day strategy and time-management session in the final week",
    ],
    batches: [{ name: "Intensive Batch", days: "Mon–Sun", time: "8:00 AM – 1:00 PM" }],
    syllabusUnits: [
      { subject: "Physics", units: physicsCrash },
      { subject: "Chemistry", units: chemistryCrash },
      { subject: "Mathematics / Biology", units: mathOrBioCrash },
    ],
  },
];

export const courses: Course[] = raw.map((r) => courseSchema.parse(r));
