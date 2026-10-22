# Supplied reference review and asset provenance

The current implementation follows the owner's blueprint: all four authorized business roles are in the native mobile app; web is a public static landing and isolated illustrative product tour. The older PDF's proposed Admin/Operations web dashboards are superseded by that direction.

Reviewed sources, copied into `docs/reference/` for portability:

- `MA_Safaris_Full_Implementation_Blueprint(1).md`: complete requirements, current scope, orange/black tokens, 24 journey areas and acceptance criteria.
- `M_A_Safaris_Interactive_Presentation.html`: full supplied standalone presentation, typography, photographs, company story, 24 interactive illustrative screens and attribution notices.
- `MA_Safaris_Web_Mobile_Project_Overview.pdf`: supplied ten-page discussion draft. The filename differs from the `(2)` reference in the blueprint. Extracted all ten pages to `business-pdf-extracted.txt`; rendered and inspected pages 1, 2 and 8 using bundled PDFium because Poppler is unavailable. This PDF is a business discussion document, not a company brochure or evidence of approved live pricing.

The preparation workspace paths in the blueprint were not available. The standalone HTML includes all six visual images, the supplied logo and four local web fonts. No original editable `styles.css`/`app.js` files or standalone high-resolution logo were supplied. The image and font bytes were extracted without altering source identity. Duplicate elephant image references were deduplicated. SHA-256 hashes, MIME and byte sizes are in `docs/reference/asset-extraction.json`.

## Attribution manifest

| Asset | Photographer and source |
| --- | --- |
| `hero.jpg` | [Justin Lane / Unsplash — giraffe](https://unsplash.com/photos/giraffe-walking-on-golden-savanna-fzsJesR92jE) |
| `safari.jpg` | [Daniel Vargas / Unsplash — elephants](https://unsplash.com/photos/a-herd-of-elephants-in-a-grassland-6UPCRhTcIZY) |
| `zanzibar.jpg` | [Taryn Elliott / Pexels — beach](https://www.pexels.com/photo/photo-of-white-sand-near-the-sea-5859092/) |
| `kilimanjaro.jpg` | [David Clode / Unsplash — mountain](https://unsplash.com/photos/landscape-photography-of-summit-3xJ9AeCwjTQ) |
| `vehicle.jpg` | [Kureng Workx / Pexels — safari vehicle](https://www.pexels.com/photo/a-safari-jeep-on-dirt-road-4404524/) |
| `brand-logo.png` | Owner-supplied Me and Adventure Safaris orange/black raster; original aspect ratio retained. High-resolution approved replacement is a release input. |
| `fonts/*.woff2` | DM Sans, Manrope, Playfair Display regular and italic. Copyright/SIL Open Font License notices preserved verbatim in `apps/web/public/assets/fonts/LICENSES.txt`. |

Originals are in `apps/web/public/assets/`. WebP derivatives retain the same attribution and exist only to improve responsive web delivery. The original supplied HTML, containing its credits and complete licenses, remains preserved. Production asset/license approval remains an owner release input; this local implementation does not claim ownership or a new license grant.

Demo prices (USD 1,250 / 890 / 1,950), people, counts, dates, payments and graphs in the product tour are fictional. Public fallback pricing is labeled “Demonstration rate.” No fictional testimonials, awards, booking statistics or conservation outcomes were added. Company contact is the supplied email/phone and is editable through the separate API's company settings.
