# Social-Card Cache Refresh Guide

The main website has been restored to its original in-page portrait and original Open Graph image. To refresh cached social cards, use the canonical page URL: `https://themekielmitchell.com/`. This is the safest URL to submit because the `www` domain resolves to it.

| Platform | Refresh method | Expected result |
| --- | --- | --- |
| Facebook and Instagram | Sign in to Meta’s Sharing Debugger, paste the canonical URL, select **Debug**, then use **Scrape Again** if it appears. | Meta retrieves the current Open Graph tags and previews the restored card. |
| LinkedIn | Open Post Inspector, paste the canonical URL, select **Inspect**, and confirm the preview. | LinkedIn refreshes the preview used for **new** posts and messages. |
| Other networks and messaging apps | Make a new test share of the canonical URL after the above checks. | Each service controls its own cache timing; existing published posts generally retain their original preview. |

> LinkedIn states that refreshing a URL changes the preview for new posts, messages, and articles only; existing posts keep their previous preview.[2]

If an older card persists, first confirm that the debug tool shows the restored original image. Then wait for that platform’s normal cache cycle and share the exact canonical URL again. Do not add random query parameters unless a platform’s own tool specifically instructs you to do so; doing this can create a separate preview cache entry.

## Official tools

1. [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## References

[1] [Meta for Developers — Sharing Debugger](https://developers.facebook.com/tools/debug/)

[2] [LinkedIn Help — Use Post Inspector to refresh URL](https://www.linkedin.com/help/linkedin/answer/a6233775)
