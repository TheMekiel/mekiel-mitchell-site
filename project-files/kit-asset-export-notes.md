# Kit Asset Export Notes

The official Kit Brand settings guidance states that a custom favicon must be a **square PNG or SVG**; ICO files are unsupported. Kit does not specify an exact pixel dimension for favicons. Source: <https://help.kit.com/en/articles/15931205-brand-settings-business-name-colors-favicon-links>.

For Kit landing pages, the official recommended landscape image size is **1920 × 1080 px**. Kit notes that responsive layouts may crop images differently by screen size, so the visual subject should remain centered. Source: <https://help.kit.com/en/articles/2502556-recommended-image-sizes-for-kit-forms-and-landing-pages>.

The exported files in this folder are intended for manual upload to Kit and do not alter the live website.

## Exported Assets

| File | Source | Specification | Intended Kit use |
| --- | --- | --- | --- |
| `kit-favicon.svg` | Existing MM favicon | 180 × 180 self-contained vector recreation | Brand settings favicon backup |
| `kit-email-logo-transparent.png` | Rendered navigation wordmark from the opening page | 195 × 74 px, transparent RGBA PNG | Email-template logo |
| `kit-landing-hero.jpg` | Opening-page hero portrait | 1920 × 1080 px progressive JPEG, approximately 188 KB | Landing-page hero image |
| `kit-landing-hero-mobile.jpg` | Opening-page hero portrait | 1080 × 1920 px progressive JPEG, approximately 180 KB | Mobile landing-page hero image |

> The source project contains only the PNG favicon, not its original vector artwork. The SVG is a close, self-contained vector recreation of the existing navy, gold-ring, and MM monogram design rather than an export from an unavailable original vector source.

The final SVG was visually checked for the compact gold MM monogram within the navy-and-gold circular treatment. The 16:9 hero preserves the full source portrait centered over a subtle, dark blurred continuation of the same image, avoiding edge-content loss on a Kit landing page.
