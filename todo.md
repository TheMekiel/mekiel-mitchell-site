# Follow-up: favicon + OG image (user-provided assets)

- [x] Copy apple-touch-icon.png and og-image.jpg into client/public/ (small config files allowed there)
- [x] Add favicon + apple-touch-icon <link> tags to head of client/index.html
- [x] Add Open Graph + Twitter Card meta tags (og:title, og:description, og:image with absolute URL using published domain mekielsite-j6ghrklh.manus.space, og:url, og:type, twitter:card)
- [x] Verify tags render and assets are served (curl checks: both 200, correct types/sizes; 7 meta/link tags found)
- [x] Confirm DEV HANDOFF stubs still untouched (8 markers, 3 REPLACE_WITH_FORM_ID)
- [x] Save the approved production checkpoint and deliver the live release


# New request: backup, domain, and integrations

- [x] Check live HTTPS behavior for themekielmitchell.com and www.themekielmitchell.com (both valid HTTPS but Manus maintenance 503)
- [x] Inspect current DNS records and Manus domain binding status (apex Cloudflare; www CNAME to cname.manus.space; active project lists only Manus domain)
- [x] Determine whether the attached .manustask package can be restored through the official recovery flow (official portal confirmed but currently blocked by 403)
- [x] Do not overwrite the current website until backup scope and restoration impact are confirmed (no backup restore or destructive replacement performed)
- [x] Review recoverable Stripe, Calendly, and Kit settings from the current project (backup remains encrypted/unrestored)
- [x] Keep the project-managed Stripe test sandbox active; production account choice remains intentionally held by the user
- [x] Publish the reviewed Stripe/Calendly changes and verify the deployed Manus and custom-domain URLs
- [x] Report blockers, DNS instructions, and required user actions
- [x] Save checkpoints only after verification and approved project changes
- [x] Deliver deployment status and next steps

---

## Completion criteria

The task is complete only when the backup restoration status, live domain/DNS status, and Stripe/Calendly/Kit wiring status are clearly verified and reported.


# Confirmed blocker: backup portal 403

- [x] Defer the backup-portal retry until the external 403 access issue is resolved
- [x] Do not claim the task backup was restored or integrated until Manus confirms successful restoration
- [x] Keep the current published project intact while restoration is blocked (no backup replacement performed)
- [x] Defer post-restoration connector re-checks until a successful backup restoration exists
- [x] Obtain verified Calendly and Kit configuration; keep Stripe account choice intentionally held
- [x] Update the user with the backup-portal blocker and safe recovery path

## Current blocker

The user and sandbox browser both received a CloudFront HTTP 403 from the official Manus backup portal. No restoration upload or destructive project replacement has been performed.

# Current service-wiring request

- [x] Confirm that the Group Home Funding Playbook audiobook is listed in the current site catalog ($37, product ID ghfp-audio)
- [x] Inspect the product and cart data needed for Stripe Checkout
- [x] Confirm the project-managed Stripe test sandbox remains active; production account selection is intentionally held
- [x] Wire the supplied 30-minute and 60-minute Calendly booking links
- [x] Superseded after receipt of real Kit IDs: all nine mapped forms now use the supplied endpoints
- [x] Verify the preview behavior (server validation, generated Stripe test session, preview link map)
- [x] Publish and verify the Calendly links; defer transaction-level Stripe redirect testing while the account choice is held
- [x] Save the verified production checkpoint and report the remaining restoration blocker

# Pre-deployment website update request

- [x] Verify current custom-domain resolution after the GoDaddy DNS change without publishing new code
- [x] Keep the Stripe account-choice decision on hold and do not switch payment credentials
- [x] Replace the Coming Soon, Newsletter, The Guide, Waitlist, Website Subscribers, purchase thank-you, new-drop, reservation, and notify-me Kit placeholders with the provided form IDs where each matching form exists
- [x] Replace the Book Mekiel vertical/awkward navigation with a horizontal tab layout
- [x] Remove the word "Inquire" from every Booking Inquiry topic row
- [x] Add a Request a Date booking form matching the supplied Topic and Preferred Format dropdown specification
- [x] Hold direct Request a Date email delivery at the user's direction and keep external submission disabled
- [x] Add prominent 30-minute and 60-minute Calendly strategy-call options to the Book Mekiel page
- [x] Remove every reference to book@themekielmitchell.com from visible content and mailto links
- [x] Remove all Amazon links, labels, and statements from the Shop page
- [x] Offer Group Home Funding Playbook paperback at $25 and hardcover at $30 through the existing cart flow
- [x] Change Group Home Funding Playbook digital bundle price to $57 and preserve the $27 eBook option
- [x] Place a Coming Soon overlay on From Arbitrage To Ownership and add a Reserve This Book action connected to the provided Kit form
- [x] Place a Coming Soon overlay on Merch, add Notify Me When Available, and add size selection to the availability form
- [x] Ensure the active cart remains a functioning purchase drawer and verify it handles the new physical-book selections
- [x] Upload the supplied eBook PDF securely for controlled post-purchase delivery preparation
- [x] Review the audiobook script, assemble the approved 99.9-minute narration, and upload it securely for controlled delivery
- [x] Document Shippo-rate and paid-session delivery checks as data-dependent limitations; user approved publication with the sender phone unset

# Booking delivery, audiobook, and fulfillment additions

- [x] Retire the blocked FormSubmit activation workflow at the user's direction
- [x] Defer the first booking-form email notification test until a replacement delivery method is approved
- [x] Stop using the FormSubmit browser activation path after repeated Cloudflare and takeover failures
- [x] Defer server-side email-provider selection at the user's direction
- [x] Defer the on-site booking API while keeping the form safely non-submitting
- [x] Defer production spam controls with the held email-delivery task
- [x] Defer direct notification delivery verification with the held email-delivery task
- [x] Hold the Request a Date email-delivery task at the user's direction
- [x] Disable the external FormSubmit handoff in the review build so preview users are not sent to the blocked activation flow
- [x] Provide the user a consolidated unpublished preview review and receive explicit deployment approval
- [x] Handle browser hash changes so direct Home, About, Shop, Merch, and Coming Soon section links switch reliably without a reload
- [x] Defer live Shippo rate and shipping-to-Stripe verification until the remaining parcel depths are supplied; sender phone is intentionally disregarded
- [x] Defer completed-session download verification until the Stripe account hold is lifted

# Latest preview corrections

- [x] Make the top-navigation Book Mekiel control render as a horizontal bar rather than a vertical block
- [x] Remove the Shop sentence about Stripe purchasing and Shippo carrier rates
- [x] Label The Group Home Funding Playbook as Book One
- [x] Label From Arbitrage to Ownership as Book Two
- [x] Remove the Get Coming Soon Updates form/banner and retain only Join Priority Waitlist
- [x] Test the active cart drawer in preview after the corrections
- [x] Test Shippo live-rate controls in preview and document the remaining fulfillment-origin/package-profile configuration blocker
- [x] Present the refreshed unpublished preview without creating a checkpoint

# Approved production deployment

- [x] Record explicit user approval to deploy the reviewed build
- [x] Leave the Shippo sender phone number unset at the user's direction
- [x] Read the complete checklist and confirm all open items are either held or documented limitations
- [x] Save the approved checkpoint and auto-publish the website
- [x] Verify HTTPS and updated content on themekielmitchell.com
- [x] Verify HTTPS and redirect/content behavior on www.themekielmitchell.com
- [x] Verify the production Home, About, Shop, Merch, and Coming Soon routes
- [x] Deliver the live URLs and published checkpoint status to the user

# Group Home Funding Playbook audiobook preview

- [x] Create a 75-second preview excerpt from the user-approved assembled audiobook
- [x] Upload the preview separately from the gated full audiobook
- [x] Add an accessible audio player to the Book One audiobook offer
- [x] Verify the preview loads, decodes, and advances in browser playback without exposing the full audiobook asset
- [x] Run 14 unit tests, TypeScript validation, and production build
- [ ] Save and publish the verified audiobook-preview update
- [ ] Verify the player on themekielmitchell.com over HTTPS
- [x] Update Open Graph and Twitter image absolute URLs from the temporary Manus hostname to themekielmitchell.com
- [x] Assess and document the consent, voice-source, API, and production requirements for an ElevenLabs audiobook narrated in Mekiel Mitchell's voice
- [x] Do not generate or publish a synthetic Mekiel Mitchell voice without explicit authorization and the necessary ElevenLabs setup
- [x] Prepare the secure Shippo test-mode path and defer live rate completion until parcel depths are supplied; merchandise remains unavailable
- [x] Store the Shippo test key only through the approved secret-management flow if required
- [x] Keep Stripe account selection on hold until the user directs otherwise

# Confirmed voice authorization and shipping follow-up

- [x] Use the user-authorized Mekiel Mitchell voice source only through ElevenLabs after its connection is securely configured
- [x] Apply the approved pronunciation "Mih-kel" in audiobook production notes and test narration
- [x] Produce review-only audiobook samples before generating or publishing the full audiobook
- [x] Confirm live Shippo carrier rates as the shipping-pricing model
- [x] Record missing parcel depths as a documented Shippo dependency; sender phone is intentionally disregarded
- [x] Determine the protected Shippo webhook route and signing/security setup; live activation remains pending

# Shipping decision update

- [x] Retire the prior flat-shipping plan
- [x] Defer live Shippo rate verification until parcel depths are provided
- [x] Defer destination-rate-to-Stripe verification until package profiles are complete
- [x] Keep production label purchase disabled until fulfillment package details are complete
- [x] Keep live Shippo key and webhook activation deferred until test-mode rate/order validation succeeds

# Confirmed domain and audiobook status

- [x] Recognize `themekielmitchell.com` and `www.themekielmitchell.com` as verified project domains
- [x] Recheck both custom domains after the binding update; apex serves HTTP 200 and www redirects to the apex over HTTPS
- [x] Supersede the paused clone task with the approved ElevenLabs history narration

# Replacement Drive voice source

- [x] Superseded: the initial Drive source was replaced by the approved ElevenLabs history narration
- [x] Superseded: source extraction was replaced by the approved ElevenLabs history narration
- [x] Superseded: the user approved the existing Verified Audiobook Voice history sample
- [x] Receive user approval of the complete preview and authorize the production release

# Alternate Drive source for voice preview

- [x] Check the new Drive video’s access, duration, and initial speech timeline
- [x] Extract clear authorized Mekiel Mitchell voice samples under ElevenLabs' upload limit
- [x] Produce clone-voice previews and present them for approval before audiobook production

# Voice-preview correction

- [x] Reject the first clone preview as not sufficiently faithful to Mekiel Mitchell's source voice
- [x] Diarize the source timeline and identify Mekiel's exact speaking intervals rather than using the mixed opening audio
- [x] Exclude intro music, the host, cross-talk, silence, and non-Mekiel voices from the clone source
- [x] Build the replacement clone from multiple clean Mekiel-only segments where available
- [x] Keep the rejected second preview documented as unacceptable; rely only on the user-approved Verified Audiobook Voice history files
- [x] Obtain explicit user approval of the existing verified history voice before assembling the audiobook

# ElevenLabs history voice review

- [x] Reject the second Mekiel clone preview because it sounded robotic and did not meet the user’s fidelity standard
- [x] Inspect ElevenLabs Text to Speech history for existing Mekiel recordings identified by the user
- [x] Compare the history recordings’ selected voice, model, and generation settings against the rejected previews
- [x] Provide the most authentic existing Mekiel history sample for explicit approval before any audiobook production
- [x] Obtain user approval for the existing `Mekiel Mitchell — Verified Audiobook Voice` history sample
- [x] Inventory all approved Group Home Funding Playbook history sections and map them to the supplied audiobook script
- [x] Download approved history audio files without regenerating sections that already exist
- [x] Organize the approved narration into script order, excluding three exact duplicates and the unscripted promotional intro
- [x] Identify missing or materially different narration before assembly; all core sections are covered and the approved shorter closing credits are retained
- [x] Assemble the 30-file, 99.9-minute approved audiobook review MP3 and reusable history-item manifest

# Current DNS and cart review

- [x] Recheck public DNS and HTTPS routing for the apex and www custom domains (valid HTTPS, maintenance 503)
- [x] Compare the custom-domain response with the active project domain binding (DNS reaches Manus; hosts are not bound to this project)
- [x] Verify the preview purchase drawer opens, renders cart items, and exposes its secure checkout controls correctly
- [x] Defer browser-level Stripe checkout redirect testing while the Stripe account choice remains held
- [x] Report the current implementation status without publishing changes
