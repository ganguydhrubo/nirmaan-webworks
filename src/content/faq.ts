export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    category: "Cost",
    question: "How much does a website actually cost?",
    answer:
      "Our starting bands are ₹25,000–₹45,000 for a brochure site, ₹45,000–₹90,000 for a business site with booking/enquiry flows, and ₹90,000–₹2,00,000 for a custom or e-commerce build. Your exact price depends on pages and features and is confirmed in writing before work starts. GST is charged extra, shown separately on every quote.",
  },
  {
    category: "Cost",
    question: "Are there any hidden costs after launch?",
    answer:
      "No. The only ongoing cost is your domain renewal (paid to the registrar, typically ₹500–₹1,500/year) and hosting if you choose a paid tier — most small sites we build run on a free hosting tier. Our optional maintenance plan (₹4,000–₹8,000/month) is exactly that — optional, not required to keep the site live.",
  },
  {
    category: "Timeline",
    question: "How long does a project take?",
    answer:
      "Typically 3–6 weeks from a signed scope to launch for a Starter or Business site, depending mostly on how quickly you can provide content and photos. See our Process page for the week-by-week breakdown.",
  },
  {
    category: "Ownership",
    question: "Do I own the website after it's built?",
    answer:
      "Yes — completely. The domain, hosting account and all code are registered in your name or handed over to you at launch, including admin logins. We keep no ongoing claim on it, and you're free to move it to another developer or host at any time.",
  },
  {
    category: "Ownership",
    question: "What happens if I stop paying for maintenance?",
    answer:
      "Nothing breaks. Maintenance is optional — if you never contact us again after launch, your site keeps running exactly as it was delivered. You simply won't receive updates, content changes or fixes from us without a maintenance arrangement or a one-off request.",
  },
  {
    category: "Scope",
    question: "I already have a website. Can you redesign it instead of starting over?",
    answer:
      "Yes. Share your current site's link and tell us what isn't working, and we'll quote a redesign. Sometimes this means rebuilding from scratch with your existing content; sometimes it means restructuring specific pages. We'll tell you honestly which one your site needs.",
  },
  {
    category: "Scope",
    question: "Do you build online stores or payment checkouts?",
    answer:
      "Not as a core offering. We build fast, content-focused websites — catalogues, bookings and enquiry flows — rather than full e-commerce checkouts with payment gateways and inventory management. If you need that, we'll tell you upfront so you can plan for the right kind of build.",
  },
  {
    category: "Content",
    question: "Do you write the content, or do I?",
    answer:
      "Either. Most clients send us rough details, price lists and photos, and we write and structure the final copy. If you'd rather write your own content, we'll build the site around it — just let us know which you'd prefer during scoping.",
  },
  {
    category: "Hosting & domain",
    question: "Do I need to buy hosting and a domain myself?",
    answer:
      "You'll need to buy the domain (we can guide you through this — it's usually ₹500–₹1,500/year from a registrar). Hosting is typically included on a free tier suited to a brochure or business site; if your site needs a paid tier due to traffic, we'll explain why and what it costs before recommending it.",
  },
  {
    category: "Support",
    question: "What if something breaks after launch?",
    answer:
      "Message us on WhatsApp or email. If it's a defect in what we built, we fix it at no charge within a reasonable period after launch. If it's a new request or change, we'll quote it separately or cover it if you're on a maintenance plan.",
  },
  {
    category: "SEO",
    question: "Will my site rank #1 on Google?",
    answer:
      "No one can honestly guarantee a specific ranking — anyone who promises this is guessing. What we do is build the technical and on-page SEO foundations properly (fast pages, correct structure, a Google Business Profile setup) so your site is competitive for the searches that matter to your business.",
  },
];
