# COPY.md — homepage copy rationale

For every homepage section: why it exists, the visitor question it answers, the objection it removes, and the action it drives. Any section that couldn't clear this bar was cut before it shipped.

Voice rules actually followed: plain, specific, Indian-English, ₹ with Indian digit grouping, no invented statistics, no banned phrases (elevate, unlock, seamless, cutting-edge, leverage, game-changer, "take your business to the next level", "solutions", "in today's digital world", em-dash-heavy rhetorical asides, "it's not just X — it's Y").

## Hero
- **Purpose:** state what we do and for whom, in one breath, before anything else competes for attention.
- **Question answered:** "What is this, and is it for a business like mine?"
- **Objection removed:** "another vague agency site" — the sub-line names concrete deliverables (mobile-first, no login systems, rupee pricing) instead of adjectives.
- **Action driven:** click through to a real demo (secondary) or start the enquiry (primary). Two CTAs, not one, because a first-time visitor and a ready-to-buy visitor need different next steps.

## Category bar
- **Purpose:** let a visitor self-identify by trade in under two seconds, Squarespace-style (see RESEARCH.md's competitor notes on why this pattern beats a generic services list).
- **Question:** "Do they understand businesses like mine specifically?"
- **Objection removed:** generic agencies that claim to serve "every industry" and therefore feel like they understand none of them.
- **Action:** click straight to the relevant industry page.

## Problem
- **Purpose:** make the cost of a weak site concrete and specific rather than a vague "poor impression" — the differentiation strategy item from RESEARCH.md most directly executed here.
- **Question:** "Does a bad website actually cost me anything real?"
- **Objection removed:** "I can put this off, it's not urgent."
- **Action:** keep reading — this section exists to raise stakes before the offer, not to convert directly.

## What we build
- **Purpose:** replace adjectives with deliverables — a direct execution of the brief's "not fast websites but loads in under 2 seconds" instruction.
- **Question:** "What do I literally get?"
- **Objection removed:** "vague scope that turns into endless back-and-forth."
- **Action:** move to the proof (industry showcase) with concrete expectations already set.

## Industry showcase
- **Purpose:** the single biggest differentiator this project has over every competitor reviewed in RESEARCH.md — a live, working demo per trade instead of a static screenshot or generic template.
- **Question:** "Can I actually see what this looks like for a business like mine, not just read about it?"
- **Objection removed:** "agency portfolios show generic templates, not real specialised work."
- **Action:** click into a demo. The explicit "these are demonstration sites for fictional businesses" line under the grid exists so no visitor is misled into thinking these are real past clients — required by Section 11's anti-fabrication rule, and arguably a trust-builder in its own right per the differentiation strategy.

## Why us
- **Purpose:** state real, checkable reasons to choose this studio over a freelancer or a template site, and — deliberately — what we refuse to do.
- **Question:** "Why you and not a ₹15,000 freelancer or a DIY Wix site?"
- **Objection removed:** three, explicitly: guaranteed rankings (nobody can promise this honestly), unlimited free revisions (a scope-creep trap), and login/payment builds (out of scope, said upfront rather than discovered mid-project).
- **Action:** builds trust ahead of the price reveal two sections later.

## Process
- **Purpose:** replace "trust us, it'll be fine" with a real week-by-week sequence and realistic ranges (3-6 weeks total, not "as fast as possible").
- **Question:** "What actually happens after I enquire, and how long does it take?"
- **Objection removed:** fear of an open-ended, unmanaged project.
- **Action:** lowers the perceived risk of the next action (submitting the enquiry form) by making the whole path visible first.

## Pricing
- **Purpose:** show real ₹ ranges before any sales conversation — the single most-repeated gap found across every Indian agency reviewed in RESEARCH.md (zero of six showed pricing on their homepage).
- **Question:** "Can I even afford this, roughly?"
- **Objection removed:** "I'll have to sit through a sales call just to find out if this is in my budget."
- **Action:** either self-select a tier and enquire, or — for the price-sensitive — self-disqualify early rather than waste a call. Both outcomes save both sides time.

## Proof
- **Purpose:** the brief's Section 11 instruction taken literally: publish something measured, not another vague claim. This section is coded to physically be unable to show a number until a real Lighthouse run populates `src/data/performance.ts` — see that file's comment.
- **Question:** "Is 'fast' just marketing talk here too?"
- **Objection removed:** every competitor's unverifiable "high-performance"/"blazing fast" claim.
- **Action:** if numbers are present, they close the speed argument; if not yet measured, the honest placeholder itself is a (smaller) trust signal — it doesn't fabricate to fill the gap.

## FAQ (teaser)
- **Purpose:** pre-empt the four questions that most reliably stall a decision (ownership, lock-in, existing-site redesign, who-writes-content) right before the final ask.
- **Question:** whatever specific doubt is left after everything above.
- **Objection removed:** last-mile hesitation.
- **Action:** either resolves the doubt inline (accordion) or routes to the full FAQ page.

## Final CTA + enquiry form
- **Purpose:** the conversion point everything above was built to reach.
- **Question:** "What do I actually have to do right now?"
- **Objection removed:** friction — short field set, WhatsApp alternative directly beside the form, explicit response-time commitment instead of a vague "we'll be in touch."
- **Action:** submit. This is the only section on the page where the action *is* the purpose.

## Footer
- **Purpose:** NAP consistency (name/address/phone) for local SEO credibility, plus every policy link the DPDP/consumer-facing obligations in RESEARCH.md require, plus the placeholder-identity disclosure (see README.md) so nobody mistakes the fictional demo brand for a real, currently-operating company.


## Demo expansion — Meridian Advisory
A founder-question brief builder replaces generic consulting promises. Scope and method supply credibility; no fabricated clients, accreditations or testimonials. See RESEARCH-DEMO-EXPANSION.md for references and rationale.


## Demo expansion — Repwork Studio
Schedule, class format and first-visit clarity replace transformation promises. All memberships and sessions are explicitly illustrative; no booking or payment is taken.
