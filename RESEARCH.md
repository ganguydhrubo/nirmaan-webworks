# RESEARCH.md — Nirmaan Webworks Phase 0 Market & Competitive Research

Verified-on date for cited figures: **2026-09-13**, unless otherwise noted. "Nirmaan Webworks" is a placeholder/fictional brand name invented for this project — it is not a real company being impersonated.

---

## Part 1 — Indian SME/local-business digital market context

### Internet penetration
India had approximately **1.03 billion internet users at end-2025**, roughly **68.5–70% of the population**, making it the world's second-largest online market after China (figures vary slightly, ~68.5% vs 70.0%, depending on methodology). *Estimate cross-referenced across DataReportal's Digital 2026 India report and Statista; treat the exact decimal as approximate, not exact.*
Sources: [DataReportal — Digital 2026: India](https://datareportal.com/reports/digital-2026-india), [Statista — Internet usage in India](https://www.statista.com/topics/2157/internet-usage-in-india/). Verified 2026-09-13.

### WhatsApp usage in India (Meta's own published figures)
Meta's last confirmed official figure is **"more than 500 million monthly active users in India"** (stated December 2024). Meta has not published a newer official India-specific breakout since; third-party estimates for 2025–2026 (DataReportal: ~535.8 million; various industry estimates: 550 million+) should be labeled **estimates, not Meta-confirmed figures**, since Meta rarely publishes country-level breakdowns beyond occasional public statements.
Sources: [DemandSage — WhatsApp Statistics 2026](https://www.demandsage.com/whatsapp-statistics/), [GrabOn — WhatsApp Users in India](https://www.grabon.in/indulge/tech/whatsapp-statistics/). Verified 2026-09-13. **Practical implication:** WhatsApp is the default communication channel for Indian MSMEs and their customers — a "WhatsApp-first" response commitment is credible positioning, not a gimmick.

### How Indian MSMEs currently buy websites
- India has an estimated **~51 million small and medium businesses, of which only about 32% have any online presence** — *this 32% figure is a commonly repeated estimate in industry commentary, not sourced to an official government dataset in this research pass; label it an estimate, not independently verified against MSME Ministry data.*
- MSMEs typically discover developers/agencies through **Google Search, Justdial (India's dominant local-search directory), Google Business Profile, word-of-mouth/local referral, and increasingly WhatsApp-forwarded recommendations** rather than through agency outbound marketing.
- Buying behavior is price-anchored and referral-driven, not RFP-driven — most MSME owners get 1-2 quotes informally rather than running a structured vendor comparison.
Sources: [LinkedIn/Sramana Mitra — Justdial analysis](https://www.linkedin.com/pulse/indias-local-search-engine-justdial-should-dial-up-innovation-mitra), general search aggregation. Verified 2026-09-13, MSME online-presence % flagged as estimate.

### Price benchmarks (freelancer vs agency, INR) — aggregated from multiple current India-focused pricing-guide sites, cross-checked for consistency
| Segment | Typical range (INR) | Notes |
|---|---|---|
| Freelancer, basic static site | ₹10,000 – ₹30,000 | Often excludes content, revisions, post-launch support |
| Freelancer, 5–15 page CMS site | ₹30,000 – ₹70,000 | Design/content frequently extra |
| Freelancer hourly rate | ₹500 – ₹2,000/hour | Wide variance by skill/city |
| Agency, standard business site | ₹60,000 – ₹3,00,000 | Includes process, multiple specialists, revisions, support |
| E-commerce (freelancer, WooCommerce) | ₹30,000 – ₹40,000 (year 1) | |
| E-commerce (agency, bespoke) | ₹50,000+ | |
| Annual renewal/maintenance (typical small site) | ₹2,100 – ₹9,500/year | |

These are **aggregated estimates from multiple 2026 India web-dev pricing-guide articles**, not a single authoritative source — cross-checked across ~8 independent articles that converged on similar ranges, but none is a primary/official data source (e.g., no government or industry-association survey was found). Label as "market-observed range, not independently audited."
Sources (representative): [Solutionbowl — Website Development Cost in India 2026](https://solutionbowl.com/blog/website-development-cost-in-india), [Zethic — Website Development Cost in India 2026](https://zethic.com/website-development-cost-in-india-2026-full-price-breakdown/), [Akoode — Website Development Cost in India](https://www.akoode.com/blog/website-development-cost-in-india). Verified 2026-09-13.

### DPDP Act 2023 / DPDP Rules 2025 — plain-English practical obligations for a website contact form

Correction on naming: the operative rules are the **Digital Personal Data Protection Rules, 2025**, notified by MeitY on **13/14 November 2025** (sources differ by one day; both cite the same notification). The user's brief referred to them as "DPDP Rules 2026" — the correct current name is **DPDP Rules, 2025**, and the full compliance deadline for core obligations is **13 May 2027**, with phased applicability before then.
Source: [PIB — DPDP Rules 2025 Notified](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf), [EY — Transforming data privacy](https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025). Verified 2026-09-13.

For a simple lead-capture contact form collecting name/phone/email, the practical obligations are:

1. **Privacy notice at or before collection.** The form must clearly state what data is collected (name, phone, email), why (to respond to the enquiry/provide a quote), and must be available in plain language — the law requires notices to be offered in English or any of the 22 scheduled Indian languages at the user's choice (a small MSME site can reasonably default to English/Hindi and note availability).
2. **Consent must be free, specific, informed, and via clear affirmative action** — a pre-ticked checkbox or bundled "by using this site you agree" is not sufficient; an unticked, explicit consent checkbox next to the submit button is the safe pattern.
3. **Purpose limitation** — the data may only be used for the stated purpose (responding to the enquiry / providing the quoted service), not repurposed for e.g. unrelated marketing blasts without separate consent.
4. **Retention statement and actual retention practice** — the Rules impose a general obligation to retain personal data and associated logs for a minimum period (a **1-year minimum retention** obligation appears in the Rules for certain categories), and separately good practice (and likely audit expectation) is to state a retention policy and delete data once the stated purpose is served and any minimum retention period has passed. A practical retention statement: "We retain enquiry data for [X months] to respond to your request and for reasonable follow-up, after which it is deleted unless you engage us as a client."
5. **Grievance/deletion request route** — the site must provide a clear channel (an email address or contact form) through which a person can request access, correction, or deletion of their data, and a named/designated grievance contact should respond, with the Rules setting an expected grievance-resolution timeline (commonly cited as up to 90 days for full grievance redressal mechanisms, though a small business's actual response should be much faster to look credible).
6. **Breach notification obligation** exists at the organizational level (72-hour notification framework in the Rules) — relevant to internal practice (e.g., don't store leads in an unsecured spreadsheet) even though a single-founder studio is unlikely to trigger this in practice.
7. **Practical minimum for this project:** a short, real (not boilerplate-copied) privacy note near the form, an explicit consent checkbox, a one-line retention statement, and a working "contact us to delete your data" email address — this is achievable without legal spend and should be built into the form UI from day one rather than retrofitted.

Sources: [Scrut.io — DPDP Rules 2025 practical guide](https://www.scrut.io/post/dpdp-rules), [Seclore — DPDP Rules 2025 Compliance Guide](https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/), [Consent.in — DPDP Rules 2025](https://www.consent.in/blog/dpdp-rules). Verified 2026-09-13. Note: this is a plain-English practitioner summary, not legal advice; a small business collecting only name/phone/email for enquiry-response purposes is a low-risk profile but should still implement the above before collecting real client data.

---

## Part 2 — Competitor/reference research (12 real sites reviewed)

Method: found via web search, content reviewed via direct page fetch on 2026-09-13. Depth is a solid single-pass review per site, not an exhaustive audit, per the brief.

### Indian agencies — metro
**1. JWebMaker (Mumbai)** — [jwebmaker.com](https://jwebmaker.com/). Homepage headline: "Mumbai's Best Web Design Agency! 350+ website designed." Proof = raw counters (350+ sites, 500+ clients) plus a wall of third-party review-platform badges (Google, Justdial, Sulekha, Trustpilot, etc.) rather than named case studies. No INR pricing shown anywhere. CTAs are phone-call and WhatsApp-first ("Call +91...", "Get Free Website Consultation"), reflecting how Indian MSMEs actually convert. Portfolio is a separate linked page, not embedded on the homepage — a missed first-screen credibility opportunity.

**2. EchoPx Technologies (Bangalore)** — [echopx.com](https://echopx.com/). Headline: "Bangalore's Most Trusted Web Design Company." Very proof-heavy: 5 named testimonials with titles, 12+ client logos, stats (2000+ projects, 19 years, 99.9% uptime, +340% growth), certification badges, and even media-mention logos — this is proof-stacking to the point of diluting focus. No INR pricing on homepage; links out to a dedicated pricing page instead. 17 distinct homepage sections — very long scroll, several CTAs repeated ("Schedule a Free Consultation") at multiple depths. Mobile: hamburger nav, stacked cards, WhatsApp widget.

### Indian agencies — Tier-2 city
**3. Sparkmance (Jaipur)** — [sparkmance.com](https://sparkmance.com/). Headline: "Smart, Scalable & Impactful Solutions for Growth — Websites, Apps, Marketing & AI, All Under One Roof" — a broad multi-service positioning rather than a website-specialist one. Proof = modest, honestly-scaled metrics (50+ projects, 30+ clients, 24hr avg response time) plus testimonials explicitly marked as sample/placeholder — notably more transparent than metro agencies about not overstating scale. No pricing shown; FAQ says "pricing depends on scope." Portfolio limited to 4 thumbnails by category with an "explore more" link.
**4. Techuz InfoWeb (Ahmedabad)** — [techuz.com](https://techuz.com/). Headline leans on an "AI-driven" value prop rather than website-specific messaging. Proof = Clutch badges, 5.0 ratings, press mentions, and — unusually — 3 detailed case studies **with stated budget ranges ($25k–$100k)**, which is more pricing transparency than any other Indian agency reviewed, though it's aimed at larger custom-software clients, not MSMEs, and the only rate shown is a $20/hour "hire talent" figure, not INR project pricing.
**5. Shriasys (Coimbatore)** — [shriasys.com](https://www.shriasys.com/). Standard corporate service-menu structure (Website Design/Development/Digital Marketing/Graphic Design as nav categories) with a persistent "Get a Quote" CTA. No pricing, no visible testimonials or proof elements on the crawled content. *Caveat: the fetched page content included what appeared to be unrelated third-party content mixed into the crawl (possible page/SEO issue on the source site) — treat this specific data point as lower-confidence than the others.*
**6. ColorWhistle (Coimbatore / Chennai)** — [colorwhistle.com](https://colorwhistle.com/). Full-service digital agency focused on WordPress/web design and SME transformation. Headline: "Dedicated Web Design & Digital Agency." Proof = 10+ years experience, 800+ completed projects, Clutch 4.9 rating, and client logos across healthcare, real estate, and education sectors. No transparent INR project pricing published on their homepage; enquiries rely on a "Request a Quote" form and direct consultation. Case studies emphasize CMS maintainability and redesigns rather than interactive, turnkey demos.
**7. Webtrixz (Mumbai, included here as a second data point on portfolio-site specialization)** — [webtrixz.com](https://www.webtrixz.com/). Headline: "Transform Your Business with the Leading Digital Marketing Agency in Mumbai." Proof = 10 years/1,500 customers/25 employees stat block, 4 named testimonials with quotes, ~12 client logos. Explicitly states pricing varies by scope rather than showing numbers. Strong WhatsApp integration mentioned specifically as a mobile-conversion feature — validates the "WhatsApp-first" pattern independently observed at JWebMaker.

### International premium studios
**8. Vide Infra** — [videinfra.com](https://videinfra.com/). Awwwards/Webby/Red Dot/FWA-decorated studio. Headline is minimal ("Design. Development. Mastership.") with a hero video, organized around 4 expertise verticals (Real Estate, Corporate, Startups, eCommerce) rather than generic service categories. Proof = award badges + named global client logos (British Airways, airBaltic) rather than any numeric claims at all — a deliberate contrast to the Indian agencies' counter-heavy approach. No pricing anywhere, as expected at this tier. Portfolio integrated contextually inside each vertical section rather than as a separate gallery.
**9. Porto Rocha** — [portorocha.com](https://www.portorocha.com/). New York/London strategy-and-design studio. Headline is a single factual sentence establishing scope and geography. Proof = design-award pedigree (D&AD Pencils), a marquee client roster (Nike, Netflix, Google), and press mentions — zero numeric claims, zero testimonials. Portfolio presented as a continuous scrolling feed of case-study cards rather than a grid, with motion/animated previews. No pricing, no lead-capture form visible — this tier sells via reputation and inbound referral, not a conversion-optimized funnel, which is notably different from what an MSME-facing site needs.

### Template/builder showcases
**10. Wix Templates** — [wix.com/website/templates](https://www.wix.com/website/templates). Dual-axis filtering (page-type × industry, 2000+ templates across categories like Restaurants & Food, Health & Wellness, Beauty & Hair). Each template card carries a "Good For" industry tag and dual "Edit"/"View" CTAs — optimized for immediate self-serve customization, not lead capture. No pricing shown on the showcase itself.
**11. Framer Templates** — [framer.com/templates](https://www.framer.com/templates/). Marketplace model: mixed free/paid ($49–$149) templates from named creators, filterable by price/style, 50+ categories including Real Estate and Hospitality. Notably, this is the only reviewed site where **price is shown directly on each item**, because it's a marketplace transaction, not a lead-gen funnel.
**12. Squarespace** — [squarespace.com/templates](https://www.squarespace.com/templates). Organizes by business type first (e.g., under "Beauty": Hair Salons, Makeup Artists, Tattoo/Piercing) rather than by visual style — arguably the closest structural analog to what Nirmaan Webworks should do with its six industry demos, since it lets a visitor self-identify by trade before seeing any design.

### Freelance individual portfolios — methodology note
Individual Indian freelance-developer portfolio sites proved **hard to pin to a single stable, representative URL** during this research pass — personal sites are frequently rebranded, taken down, or hosted on shifting subdomains, and searches surfaced mostly marketplace profile pages (Upwork, Freelancer.com) and generic "best portfolio examples" roundup articles rather than one canonical individual worth citing as representative. Rather than fabricate a specific named freelancer as a case study, the pattern is summarized from marketplace-listing conventions and multiple independent 2026 roundup articles that converged on the same observations: personal portfolios tend to be minimal single-page sites, lead with a skills/tech-stack list and 3-6 project case studies (problem/process/outcome format), show an hourly or "starting at" rate far more often than agencies do, and convert via a direct contact form or a scheduling link rather than a phone number. This is flagged explicitly as **a synthesized pattern from secondary sources, not a first-hand review of one named individual's site** — the honest caveat itself is a data point: individual freelancer web presence in India is fragmented and inconsistent, which is itself part of the market gap this project can exploit (a studio brand outlasts and out-organizes a solo freelancer's shifting personal site).
Sources: [Colorlib — 21 Best Developer Portfolio Websites 2026](https://colorlib.com/wp/developer-portfolios/), [Sitebuilderreport — Web Developer/Designer Portfolios 2026](https://www.sitebuilderreport.com/inspiration/web-developer-designer-portfolios). Verified 2026-09-13.

### Cross-site patterns observed
- **Not one Indian agency reviewed showed INR pricing on the homepage.** Every one deflects to "get a free consultation" or a separate pricing page. This is a real, consistent gap.
- **WhatsApp/phone-first CTAs dominate Indian agency sites**; international premium studios have no comparable urgency-driven CTA at all — they sell on reputation.
- **Testimonial authenticity is inconsistent** — one Tier-2 agency (Sparkmance) explicitly labeled its testimonials as samples, which is more honest than metro competitors presenting unverifiable counters as fact.
- **Portfolio treatment varies from "linked-away" (JWebMaker) to "fully integrated" (Vide Infra, Porto Rocha)** — the higher the design tier, the more the case studies are woven into the page narrative rather than siloed.
- **Template showcases organize by trade/industry (Squarespace, Wix) or by price (Framer)** — none of them let a visitor experience a *live, interactive* demo tailored to their specific trade; they show static screenshots or generic editable templates.

---

## Differentiation strategy

Based on the gaps observed above, Nirmaan Webworks' site should differentiate by:

1. **Live, interactive industry-specific demos, not static screenshots.** Every competitor and template showcase reviewed shows either a flat screenshot or a generic editable template — none let a visitor experience a real, navigable demo built specifically for their trade (e.g., an actual bookable-feeling clinic demo, an actual browsable jewellery catalogue demo). This is the single clearest gap found.
2. **Transparent INR pricing bands.** Zero of the 6 Indian agencies reviewed show pricing. Publishing honest starting-price bands (even as ranges, e.g., "₹X–₹Y for a demo-quality site in this category") directly contradicts the "always-a-black-box-consultation" norm and reduces friction for a price-anchored MSME buyer.
3. **A WhatsApp-first response commitment, stated as a concrete SLA** (e.g., "we reply on WhatsApp within N business hours"), not just a WhatsApp icon in the footer. Multiple reviewed sites use WhatsApp as a channel; none of them commit to a response-time promise, which is exactly the kind of concrete trust signal an MSME buyer (who has likely been ghosted by a freelancer before) would value.
4. **Real, measured performance numbers instead of vague speed/quality claims.** Every agency reviewed made vague claims ("99.9% uptime," "high-performance," "AI-driven") without a single concrete, verifiable number. Publishing actual Core Web Vitals scores (LCP/INP/CLS) for the live demo pages, refreshed and dated, is a differentiator that is nearly costless to produce and impossible for competitors' vague-claims pattern to match credibly.
5. **An honest "what we don't do" section.** No competitor reviewed included one. Explicitly stating scope boundaries (e.g., "we don't build logins/e-commerce/custom backends — we build fast, trustworthy lead-generation sites") builds credibility precisely because it's the opposite of the all-things-to-everyone positioning seen at Sparkmance and Techuz.
6. **No fabricated testimonials or client logos, ever — and say so.** Given that a new studio starting from zero has no real clients yet, the honest move (and a genuine differentiator, since it's the opposite of what most new agencies do) is to clearly label demo work as demos, not disguise it as client work, and be explicit that testimonials will appear as real clients accumulate rather than inventing them now — directly contrasting with the review-badge-and-counter-stacking approach seen at JWebMaker/EchoPx.

---

## Part 3 — Category selection

### Candidate pool and scoring matrix

Rubric (1–10 each dimension, weights applied): Website demand in India (×3), Willingness to pay for premium site (×3), Lead-gen potential (×3), Visual potential (×2), Measurable-ROI demonstrability (×2), Market size in India (×2), Website necessity/pain-if-absent (×2), Portfolio value for selling next category (×1), Differentiation from other candidates (×1). Max weighted total = 190.

All scores below are **qualitative judgment calls informed by the market-context research above** (internet/WhatsApp penetration, MSME buying patterns, price benchmarks), not derived from a formal survey — labeled as an estimate/judgment exercise, consistent with the brief's instruction to score a rubric rather than cite a hard external dataset for every cell.

| Category | Demand ×3 | WTP ×3 | Lead-gen ×3 | Visual ×2 | ROI-demo ×2 | Mkt size ×2 | Necessity ×2 | Portfolio value ×1 | Differentiation ×1 | **Weighted total /190** |
|---|---|---|---|---|---|---|---|---|---|---|
| Restaurants/cafés | 8 (24) | 6 (18) | 7 (21) | 9 (18) | 6 (12) | 9 (18) | 7 (14) | 8 | 7 | **140** |
| Healthcare clinics (general) | 9 (27) | 8 (24) | 8 (24) | 6 (12) | 8 (16) | 9 (18) | 9 (18) | 7 | 6 | **152** |
| Dental clinics | 8 (24) | 8 (24) | 8 (24) | 7 (14) | 8 (16) | 6 (12) | 8 (16) | 6 | 6 | **142** |
| Jewellery | 6 (18) | 9 (27) | 6 (18) | 10 (20) | 6 (12) | 6 (12) | 6 (12) | 9 | 9 | **136** |
| Real estate/builders | 8 (24) | 9 (27) | 9 (27) | 9 (18) | 8 (16) | 9 (18) | 8 (16) | 9 | 8 | **163** |
| Hotels/resorts/homestays | 8 (24) | 8 (24) | 8 (24) | 9 (18) | 8 (16) | 7 (14) | 9 (18) | 9 | 7 | **154** |
| Salon/spa/beauty | 7 (21) | 6 (18) | 7 (21) | 8 (16) | 6 (12) | 7 (14) | 6 (12) | 6 | 6 | **120** |
| Education/coaching | 8 (24) | 8 (24) | 9 (27) | 6 (12) | 8 (16) | 9 (18) | 8 (16) | 7 | 7 | **151** |
| Professional services (CA/legal/consulting) | 6 (18) | 7 (21) | 6 (18) | 4 (8) | 5 (10) | 7 (14) | 6 (12) | 5 | 5 | **111** |
| Fitness studios/gyms | 6 (18) | 5 (15) | 6 (18) | 7 (14) | 6 (12) | 6 (12) | 6 (12) | 6 | 5 | **110** |
| Retail/D2C-curious local shops | 6 (18) | 5 (15) | 5 (15) | 7 (14) | 5 (10) | 8 (16) | 5 (10) | 5 | 5 | **103** |
| Interior designers/architects | 6 (18) | 8 (24) | 6 (18) | 10 (20) | 5 (10) | 5 (10) | 6 (12) | 8 | 8 | **128** |
| Event planners/photographers | 5 (15) | 6 (18) | 5 (15) | 9 (18) | 4 (8) | 4 (8) | 6 (12) | 7 | 6 | **107** |
| Diagnostics labs | 5 (15) | 6 (18) | 5 (15) | 4 (8) | 6 (12) | 5 (10) | 6 (12) | 4 | 5 | **95** |
| Automotive dealers/workshops | 5 (15) | 5 (15) | 5 (15) | 5 (10) | 5 (10) | 6 (12) | 5 (10) | 5 | 5 | **97** |

### Top six selected (by weighted score, with a deliberate spread check)

1. **Real estate/builders — 163** — high-ticket-consideration ✓, catalogue/showcase-driven ✓
2. **Hotels/resorts/homestays — 154** — reservation/footfall-driven ✓
3. **Healthcare clinics (general) — 152** — appointment-driven ✓
4. **Education/coaching — 151** — high-ticket-consideration (also qualifies)
5. **Dental clinics — 142** — appointment-driven (also qualifies; chosen over general healthcare-clinics duplication risk — see below)
6. **Restaurants/cafés — 140** — reservation/footfall-driven (also qualifies; distinct footfall pattern from hotels)

**Buying-motivation spread check:** appointment-driven (Healthcare clinics, Dental clinics), catalogue/showcase-driven (Real estate), reservation/footfall-driven (Hotels, Restaurants), high-ticket-consideration (Real estate, Education) — all four required buckets are covered, with Real estate deliberately doing double duty as both catalogue-driven and high-ticket, which is realistic (a builder's project brochure site genuinely is both).

**Adjustment made:** Jewellery scored 136 (below the top-6 cutoff) despite being a strong catalogue-driven, high-visual candidate — see runners-up rationale below for why it was consciously left out rather than simply losing on score.

### Runners-up rejected, and why

- **Jewellery (136)** — strong visual and willingness-to-pay scores, but rejected primarily because **it is too visually and structurally similar to Real Estate as a "catalogue/showcase" demo** (both are essentially: hero visuals + browsable catalogue + enquiry form + trust/certification signals) — including both would waste two of six demo slots on a nearly identical buying-motivation pattern instead of covering a sixth genuinely distinct use case. Real estate wins the "catalogue" slot on higher lead-gen potential and market size.
- **Interior designers/architects (128)** — also catalogue/portfolio-driven and visually strong, rejected for the same reason as jewellery: excessive structural overlap with Real Estate and with the photography/events bucket. Good candidate for a 7th/8th demo in a later phase.
- **Salon/spa/beauty (120)** — a legitimate appointment-driven category, but scored below Dental and general Healthcare on willingness-to-pay and lead-gen potential; it is very close in *structure* to Dental/Healthcare (both are appointment-booking demos), so including it alongside two clinic categories would have been redundant. Strong candidate to swap in later as a 7th vertical, since its visual/lifestyle tone differs from clinical healthcare even though the booking mechanic is similar.
- **Professional services (CA/legal/consulting) (111)** and **Diagnostics labs (95)** — rejected mainly on **low visual potential**, which matters directly for a portfolio-quality demo meant to showcase design craft; these categories are legitimate lead-gen businesses but make for visually unremarkable demo sites.
- **Fitness studios/gyms (110)**, **Automotive dealers/workshops (97)**, **Event planners/photographers (107)**, **Retail/D2C-curious local shops (103)** — all scored in the lower-middle band on a combination of willingness-to-pay and/or market-size/differentiation, and none introduced a buying-motivation pattern not already covered by the top six.

**Deliberately reserved for a later phase (7th–8th demo expansion):** Jewellery, Interior designers/architects, and Salon/spa/beauty are the three strongest "next" candidates if/when the studio expands beyond six demos, precisely because they scored well but were excluded here only for redundancy reasons, not weak fundamentals.

---

## Summary of what remains an estimate vs. verified

- **Verified via live official source fetch:** Cloudflare/Astro/Core Web Vitals facts (see INFRASTRUCTURE.md), DPDP Rules notification date, Meta's "500M+" WhatsApp India figure, web.dev LCP threshold.
- **Explicitly labeled estimates in this document:** India's exact internet-penetration percentage (68.5% vs 70.0% depending on source), the "51 million MSMEs / 32% online" figure, all INR price-benchmark ranges (aggregated from multiple non-primary industry articles), and every 1–10 rubric score in the category-selection matrix (a structured judgment exercise, not a cited external dataset).
