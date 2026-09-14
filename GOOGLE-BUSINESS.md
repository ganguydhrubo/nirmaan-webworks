# GOOGLE-BUSINESS.md

Off-site local SEO steps the business owner must do once real business details replace the placeholder identity in `config/site.ts`. None of this can be done from the codebase — it requires a human with account access to Google and the other listed platforms.

## 1. Claim and verify a Google Business Profile (GBP)

1. Go to google.com/business, add the business with the **exact** name, address and phone (NAP) that appears in `config/site.ts` — consistency between the website footer and the GBP listing is one of the strongest local-ranking signals.
2. Choose the most specific category available (e.g. "Real Estate Developer", "Multispeciality Hospital", "Dental Clinic", "Coaching Center", "Restaurant" — not a generic "Business" category).
3. Verify via the method Google offers (postcard, phone, or instant verification if eligible).
4. Add business hours matching `siteConfig.businessHours`, service areas matching `siteConfig.serviceAreas`, and the website URL.

## 2. NAP consistency across the web

Search for the business name + city on Google and fix any old/incorrect listings (a previous freelancer-built site, an old Justdial entry, a directory scrape) so every mention of the business online agrees on the same name, address and phone number. Inconsistent NAP is one of the most common reasons a legitimate local business fails to rank.

## 3. Photos

Upload real, current photos to the GBP listing — storefront/exterior, interior, team, product/menu/room shots depending on the business type. Listings with photos get substantially more engagement than text-only listings; this is the one place where the *actual* business's real photos belong (unlike the demo sites in this repo, which deliberately use licensed stock/illustration for a fictional business).

## 4. Reviews

Ask real customers to leave reviews on the GBP listing after a real transaction. Never buy reviews, never write fake ones, and never incentivize a review in exchange for a discount (violates Google's guidelines and can get a listing suspended). Respond to every review, positive or negative, in the owner's own voice.

## 5. Category-specific directories

Beyond Google, list the business (with identical NAP) on the directories that actually matter for Indian local search: Justdial, Sulekha, and any category-specific directory relevant to the trade (e.g. Practo for a clinic/dentist, MagicBricks/99acres for real estate, Zomato/Swiggy listing — separate from the delivery ordering flow — for a restaurant).

## 6. Posts and updates

GBP supports posting updates (offers, events, new menu items) directly to the listing, which shows up in local search results. This has zero engineering dependency — it's a manual, ongoing task for whoever runs the business's marketing.

## 7. Insights

GBP's own Insights panel (search terms that led to a listing view, calls, direction requests) is a free, zero-setup measurement tool distinct from anything in this codebase's analytics — check it monthly.

## Why this file exists separately from SEO.md

SEO.md covers everything the codebase controls (metadata, structured data, sitemap, indexability). This file covers everything it can't — off-platform signals that only exist once a real business, not a placeholder, is running the site. Skipping this step means the on-page SEO work in this repo has much less to anchor to in local search results.
