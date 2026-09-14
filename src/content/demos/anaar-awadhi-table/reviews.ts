import { z } from "zod";

const reviewSchema = z.object({
  name: z.string(),
  location: z.string(),
  rating: z.number().min(1).max(5),
  quote: z.string(),
  dish: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

const raw: Review[] = [
  {
    name: "Ritu Agarwal",
    location: "Gomti Nagar, Lucknow",
    rating: 5,
    quote:
      "Loved the Galouti Kebab — best I've had outside old Lucknow. It genuinely dissolves before you finish chewing it.",
    dish: "Galouti Kebab",
  },
  {
    name: "Arjun Mehta",
    location: "Visiting from Delhi",
    rating: 5,
    quote:
      "Ordered the Nihari on a whim at 8pm and regretted not coming earlier in the trip. The bone marrow alone was worth the flight.",
    dish: "Nihari",
  },
  {
    name: "Sana Khan",
    location: "Hazratganj, Lucknow",
    rating: 4,
    quote:
      "The Awadhi Mutton Biryani doesn't drown you in spice like most places nearby — it's restrained, layered, properly dum-cooked. Sheermal was a good call alongside it.",
    dish: "Awadhi Mutton Biryani",
  },
  {
    name: "Vikram Sethi",
    location: "Aliganj, Lucknow",
    rating: 5,
    quote:
      "Took my parents for their anniversary. The Shahi Tukda arrived warm with the rabri still slightly melting — small detail, but it's the kind of thing that tells you someone's actually paying attention in the kitchen.",
    dish: "Shahi Tukda",
  },
  {
    name: "Farah Siddiqui",
    location: "Indira Nagar, Lucknow",
    rating: 4,
    quote:
      "Booked a table for six on a Saturday and they'd actually held it — no 20-minute wait at the door like most Hazratganj places. Kakori Kebab was the table's favourite.",
    dish: "Kakori Kebab",
  },
];

export const reviews: Review[] = raw.map((r) => reviewSchema.parse(r));
