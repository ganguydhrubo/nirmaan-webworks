# CREDITS.md — Fonts, images and other third-party assets

Every asset in this repository is either self-authored (original SVG icons/wordmarks) or downloaded at build/authoring time under a licence that permits commercial use, with attribution recorded below. Nothing is hotlinked or fetched from a third party at runtime.

## Fonts

Both typefaces are open-source (SIL Open Font License 1.1), self-hosted as static per-weight `woff2` files, subset to Latin + Latin Extended-A (which covers the ₹ rupee sign, U+20B9) rather than shipping the full variable font.

| Family | Weights used | Role | Source | Licence | Downloaded |
|---|---|---|---|---|---|
| Fraunces (static instances) | 500, 600 | Display/headings | https://fonts.google.com/specimen/Fraunces (designed by Undercase Type / Google Fonts) | SIL Open Font License 1.1 | 2026-09-13 |
| Manrope (static instances) | 400, 500, 600, 700 | Body/UI text | https://fonts.google.com/specimen/Manrope (designed by Mikhail Sharanda) | SIL Open Font License 1.1 | 2026-09-13 |

Static woff2 files were obtained from Google Fonts' `fonts.gstatic.com` CDN via the CSS2 API (requesting a legacy user-agent to receive fixed-weight static instances instead of the variable font), then saved into `public/fonts/` and referenced only via local `@font-face` rules in `src/styles/fonts.css` — no `fonts.googleapis.com` stylesheet or `fonts.gstatic.com` request happens at runtime in production.

## Images

Photography for the main marketing site and the six demo sites is sourced from Unsplash and Pexels, downloaded at build time and stored under `src/assets/` and `public/images/`, never hotlinked. Every image used will be listed here with photographer, source URL, licence and download date as it is added during the design/build phase (Section 6/7 of the build).

**Status: photography sourcing is in progress as part of the homepage and demo builds — this table will be completed before the design is marked final. See AUDIT.md for the current state.**

| File | Subject | Photographer | Source URL | Licence | Downloaded |
|---|---|---|---|---|---|
| _pending_ | | | | | |

## Icons

All interface icons are original inline SVGs authored for this project (`src/icons/`) — no icon font, no third-party icon package.

## Illustrations / decorative graphics

Any decorative graphics (dividers, background textures, brand marks for the six fictional demo businesses) are original SVGs authored for this project.
