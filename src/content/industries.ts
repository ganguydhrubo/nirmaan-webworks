import { z } from "zod";

const industryContentSchema = z.object({
  slug: z.string(),
  intro: z.string(),
  painPoints: z.array(z.string()).min(3),
  features: z.array(z.object({ title: z.string(), body: z.string() })).min(3),
  localSeoBlurb: z.string(),
});

export type IndustryContent = z.infer<typeof industryContentSchema>;

const raw: IndustryContent[] = [
  {
    slug: "real-estate",
    intro:
      "Buyers now shortlist projects online before ever visiting a site office. A slow gallery or a missing floor plan is enough for them to move to the next listing.",
    painPoints: [
      "Your project only appears on third-party portals you don't control or brand",
      "Floor plans are shared as WhatsApp-forwarded images instead of a proper gallery",
      "There's no way for a serious buyer to estimate EMI before calling your sales team",
    ],
    features: [
      { title: "Project & unit listings with filters", body: "Browse by configuration, budget and possession date, with real floor plans." },
      { title: "Working EMI calculator", body: "Buyers can estimate monthly payments themselves before they call — fewer unqualified enquiries." },
      { title: "Site-visit booking", body: "A dated booking form that routes straight to your sales team with the buyer's preferred slot." },
      { title: "RERA and builder credentials", body: "A dedicated place to show registration numbers and past project handovers." },
    ],
    localSeoBlurb: "We structure project pages around how buyers actually search — \"2BHK flats in [locality]\", \"[builder name] possession date\" — so your project pages can be found, not just your homepage.",
  },
  {
    slug: "hotels-resorts",
    intro:
      "Every booking made through an OTA costs you 15–20% in commission. A direct-booking-ready website pays for itself the first month it converts even a handful of guests.",
    painPoints: [
      "Guests can only find you through OTAs that take a cut of every booking",
      "Your rooms and experiences are buried in a photo dump with no structure",
      "There's no way to show off packages, seasonal offers or house rules clearly",
    ],
    features: [
      { title: "Room types with real rates", body: "Each room type gets its own gallery, amenities and an enquiry-to-book flow." },
      { title: "Experiences & packages", body: "Show seasonal packages and local experiences as their own bookable-feeling sections." },
      { title: "Direct-booking messaging", body: "We build the case for booking direct — clearly, without disparaging OTAs your guests already trust." },
      { title: "Location & how-to-reach", body: "Real directions for guests arriving by road, rail or air, not just a map pin." },
    ],
    localSeoBlurb: "We target \"[type of stay] in [location]\" and \"[location] homestay/resort\" search patterns, plus a proper Google Business Profile setup so mapped searches lead straight to you.",
  },
  {
    slug: "healthcare-clinics",
    intro:
      "Patients decide which clinic to call while scrolling on their phone, often outside your working hours. If your site doesn't answer their first three questions, they call someone else.",
    painPoints: [
      "No clear list of specialisations or doctors available on your current site (or no site at all)",
      "Booking means calling during working hours and hoping someone picks up",
      "Patients can't tell what insurance or payment options you accept before visiting",
    ],
    features: [
      { title: "Doctor profiles with real qualifications", body: "Photo, specialisation, registration details and consulting hours per doctor." },
      { title: "Mobile-first appointment CTA", body: "A fixed booking button on every page, sized for a thumb, not a mouse." },
      { title: "Specialisation & conditions pages", body: "So a search for a specific condition can land a patient directly on the relevant page." },
      { title: "Patient FAQs & insurance info", body: "The practical questions patients actually have, answered before they call." },
    ],
    localSeoBlurb: "We build around \"[specialisation] doctor near me\" and \"[condition] treatment in [city]\" search intent, with per-doctor and per-specialisation pages rather than one generic services list.",
  },
  {
    slug: "education-coaching",
    intro:
      "Parents compare institutes the way they compare colleges — faculty, results, fees, and whether the place looks legitimate. A Facebook page with a phone number doesn't clear that bar anymore.",
    painPoints: [
      "No single place to see batch timings, faculty and fees together",
      "Enquiries come in as random WhatsApp messages with no context on what course they're asking about",
      "Nothing to show admission-ready parents besides word of mouth",
    ],
    features: [
      { title: "Batch schedules & course pages", body: "Each course gets its own page with timing, duration and what's covered." },
      { title: "Faculty profiles", body: "Real qualifications and experience — the credibility signal most competitor sites skip." },
      { title: "Fee structure shown upfront", body: "Transparent fees reduce time wasted on enquiries that were never going to convert." },
      { title: "Demo class / admission enquiry form", body: "A specific, low-friction way for a parent to ask about admission for a named course." },
    ],
    localSeoBlurb: "We target \"[subject] coaching in [city]\", \"best [exam] institute [city]\" and course-specific queries, which convert far better than a single generic homepage ever will.",
  },
  {
    slug: "dental-clinics",
    intro:
      "Dental visits are one of the most search-researched, most anxiety-driven purchase decisions in local healthcare. Patients want to see the clinic, the dentist and rough pricing before they ever call.",
    painPoints: [
      "No visible price range for common treatments, so patients assume the worst and don't call",
      "No way to see the clinic or meet the dentist before an anxious first visit",
      "Booking depends entirely on phone calls during clinic hours",
    ],
    features: [
      { title: "Treatment catalogue with indicative pricing", body: "Root canal, implants, aligners — listed with a starting price range, not hidden until a visit." },
      { title: "Dentist bio & qualifications", body: "A named, qualified dentist builds more trust than a stock photo of a smiling model." },
      { title: "Clinic tour gallery", body: "Real photos of the waiting area and treatment rooms — the anxiety-reduction proof patients want." },
      { title: "Appointment booking + financing note", body: "Clear next step, plus an honest note on EMI/financing options if you offer them." },
    ],
    localSeoBlurb: "We build around \"[treatment] cost in [city]\" and \"dentist near me\" search intent — the two query types that most reliably bring in a first-visit patient.",
  },
  {
    slug: "restaurants-cafes",
    intro:
      "Most restaurant searches end on a food-delivery aggregator, not your own site — even for dine-in customers. A proper menu and location page pulls that decision back to you.",
    painPoints: [
      "Your menu only exists as an Instagram photo dump or a food-app listing you don't control",
      "No easy way for a customer to check today's hours or reserve a table",
      "Nothing to distinguish you from every other listing in a delivery app search",
    ],
    features: [
      { title: "Full categorised menu with ₹ prices", body: "Starters, mains, chef's specials — properly structured, not a scanned PDF." },
      { title: "Table reservation form", body: "A simple form with date, time and party size that routes to WhatsApp or your inbox." },
      { title: "Gallery & chef's specials", body: "Real food photography that does more selling than any adjective could." },
      { title: "Location, timings & offers", body: "A proper Google-Maps-style location block plus a place for festive or weekday offers." },
    ],
    localSeoBlurb: "We target \"[cuisine] restaurant in [locality]\" and \"[restaurant name] menu\" queries — the exact searches that happen right before someone decides where to eat.",
  },
  {
    slug: "jewellery",
    intro: "A jewellery purchase starts with a feeling, then becomes a set of practical questions about materials, budget and fit. A considered catalogue makes room for both.",
    painPoints: ["Collections disappear into an unstructured social feed", "Customers cannot compare materials and price ranges before visiting", "Every enquiry starts from scratch without a named piece or collection"],
    features: [
      { title: "Collection and budget filters", body: "Help customers explore necklaces, earrings, rings and bangles within a comfortable range." },
      { title: "Detailed product pages", body: "Give each piece space for materials, dimensions, care notes and clearly labelled pricing." },
      { title: "Personal enquiry handoff", body: "Connect the catalogue to your real enquiry or WhatsApp flow without pretending to take payment." },
      { title: "An editorial brand identity", body: "Bring your own photography, craft story and visual language into a distinctive storefront." },
    ],
    localSeoBlurb: "We structure real store pages around collection, material and city searches, with accurate showroom information supplied by the business. Fictional demo pages remain noindex.",
  },
  {
    slug: "interior-design",
    intro: "A prospective client wants more than a beautiful room. They want to understand the brief, the choices, the scope and whether their budget belongs in the conversation.",
    painPoints: ["Portfolio images lack the brief and reasoning behind the work", "Design fees and execution budgets are confused", "New enquiries arrive with no area, scope or budget context"],
    features: [
      { title: "Project case studies", body: "Tell the story of each space through its brief, plan, material choices and constraints." },
      { title: "A browsable project index", body: "Separate residential, retail and workspace projects so visitors find relevant work quickly." },
      { title: "Transparent scope and process", body: "Explain what happens from the initial survey through design and site coordination." },
      { title: "Budget planning tools", body: "Offer a labelled estimate with explicit inclusions and exclusions before the first conversation." },
    ],
    localSeoBlurb: "We organise your real portfolio around project type and location, with dedicated case studies rather than a single undifferentiated gallery.",
  },
  {
    slug: "salon-spa",
    intro: "Choosing a salon is personal. Guests want a sense of the atmosphere, a clear service menu and enough practical detail to plan a visit with confidence.",
    painPoints: ["Prices and service durations are buried in image menus", "Guests struggle to combine services into a visit that fits their day", "The booking step leaves people unsure whether a slot has actually been confirmed"],
    features: [
      { title: "A complete service menu", body: "Group hair, colour, skin and body services with durations and understandable starting prices." },
      { title: "A visit planner", body: "Let guests add services and see the combined sample time and price before enquiring." },
      { title: "Ritual and occasion pages", body: "Explain combinations, inclusions and who each visit is designed for." },
      { title: "Honest appointment enquiries", body: "Route requests to a real contact channel and make confirmation status clear." },
    ],
    localSeoBlurb: "We build around the services and neighbourhoods your real salon serves, backed by accurate opening hours, pricing and contact details supplied by you.",
  },
  {"slug":"professional-services","intro":"Clear scopes and a thoughtful first conversation help owner-led businesses choose an adviser with confidence.","painPoints":["Expertise is buried in generic service lists","Prospects cannot understand the engagement process","Enquiries arrive without context"],"features":[{"title":"Interactive brief builder","body":"Help visitors identify the question they want to explore."},{"title":"Clear practice areas","body":"Explain scope, deliverables and boundaries."},{"title":"Editorial identity","body":"Make expertise visible with confident typography and useful content."}],"localSeoBlurb":"We structure real professional services websites around relevant service, product and locality searches, using accurate information supplied by the business. Fictional demos remain noindex."},  {"slug":"fitness-studios","intro":"A studio website should make it easy to choose a training format, find a time and understand the commitment.","painPoints":["Timetables only exist in social posts","Visitors cannot compare formats and durations","Membership details hide the commitment"],"features":[{"title":"Class finder","body":"Filter the sample week by day and training format."},{"title":"First-visit guidance","body":"Explain arrival, equipment and how coaching adapts to new members."},{"title":"Transparent membership","body":"Show rupee pricing, validity and inclusions."}],"localSeoBlurb":"We structure real fitness studios websites around relevant service, product and locality searches, using accurate information supplied by the business. Fictional demos remain noindex."},  {"slug":"events-photography","intro":"Couples choose an atmosphere before they compare a package. A cinematic portfolio can still answer practical questions about coverage and delivery.","painPoints":["Images disappear into an endless social feed","Coverage and deliverables are difficult to compare","Enquiries omit dates and event scope"],"features":[{"title":"Immersive story gallery","body":"Explore an editorial narrative with keyboard-accessible full-screen viewing."},{"title":"Coverage clarity","body":"Explain events, hours, deliverables and exclusions."},{"title":"Considered enquiry path","body":"Give couples a useful checklist for the first conversation."}],"localSeoBlurb":"We structure real events & photography websites around relevant service, product and locality searches, using accurate information supplied by the business. Fictional demos remain noindex."},
];

export const industryContent: Record<string, IndustryContent> = Object.fromEntries(
  raw.map((r) => [r.slug, industryContentSchema.parse(r)]),
);
