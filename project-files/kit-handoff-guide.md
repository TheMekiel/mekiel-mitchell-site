# Kit Handoff Guide

This handoff package lets you recreate the opening page’s visual system in Kit without changing the live website. Upload only the image and favicon files; use the text, HTML, and CSS files as references or pasted content.

| Kit purpose | Use this file | Action in Kit |
| --- | --- | --- |
| Brand favicon | `kit-favicon.svg` | In **Settings → Brand**, select **Upload image** under Favicon. Kit accepts square PNG or SVG favicons; ICO is unsupported. [1] |
| Brand colors and fonts | `kit-brand-settings.txt` | Keep open as your reference while configuring Brand colors and creating templates. It is not uploaded. |
| Email header logo | `kit-email-logo-transparent.png` | Upload to the **Media gallery** when you prefer an image logo in an email header. |
| Basic email layout | `kit-email-template.html` | Paste or adapt it in a **Custom HTML Email Template**. It is ready to use as-is with a self-contained branded wordmark and Kit’s documented `email-button` class. [2] |
| Primary button styling | `kit-primary-button.css` | Copy the `.email-button` rule into the custom template’s CSS. Preview or send a test email to see the applied button styling. [2] |
| Desktop landing-page hero | `kit-landing-hero.jpg` | Upload to the Media gallery and place in a wide landing-page image block. |
| Mobile landing-page hero | `kit-landing-hero-mobile.jpg` | Upload to the Media gallery and use where your Kit landing-page layout is portrait-first. |
| Social-sharing image | `kit-social-sharing-og.jpg` | Upload to the Media gallery for use in a social/share image location or as a branded social visual. The 1200 × 630 landscape canvas retains the opening page’s Open Graph composition. |

> **Use `kit-handoff-guide.md` first.** It tells you which asset corresponds to each Kit task. For the specific files you will actually upload, use `kit-favicon.svg`, `kit-email-logo-transparent.png`, `kit-landing-hero.jpg`, `kit-landing-hero-mobile.jpg`, and `kit-social-sharing-og.jpg`.

Kit accepts JPG, PNG, GIF, and WebP media files smaller than 25 MB. The exported JPG files meet that file-type and size requirement. [3] For landing pages, Kit recommends 1920 × 1080 px for landscape images and 1080 × 1920 px for portrait images; the package contains one optimized image at each size. [4]

## References

[1]: https://help.kit.com/en/articles/15931205-brand-settings-business-name-colors-favicon-links "Kit Help Center — Brand settings: Business name, colors, favicon, links"
[2]: https://help.kit.com/en/articles/2810398-code-snippets-for-custom-email-templates "Kit Help Center — Code Snippets for Custom Email Templates"
[3]: https://help.kit.com/en/articles/3743270-media-gallery "Kit Help Center — Media gallery"
[4]: https://help.kit.com/en/articles/2502556-recommended-image-sizes-for-kit-forms-and-landing-pages "Kit Help Center — Recommended image sizes for Kit forms and landing pages"
