# Replacement Voice Source Status

The user supplied a publicly accessible Google Drive link titled `From The Block to Owning the Block w: Mekiel Mitchell 7:3:26.mp4`. The viewer identifies the file as a 1.1 GB video. Its metadata makes the file accessible for playback, but the full download would be unnecessary for initial voice-source assessment and must not be used as the ElevenLabs clone source without extracting a short, clear speech-only segment below ElevenLabs' upload limit.

The user reported that Mekiel's self-introduction begins around the 57-minute point. The Drive viewer transcript control was available but did not expose transcript text through the current unauthenticated view. The next step is to obtain a short isolated clip around that time, either from Drive playback or from the user as a direct upload.

The current public Drive viewer embeds the media through a Google-hosted player frame. Its main page does not expose a directly accessible HTML video element or a seekable stream URL to the current browser context, so it cannot be used to accurately extract a short source segment without downloading the 1.1 GB file. A direct attachment of the 57-minute introduction segment remains the most reliable and privacy-preserving source for the authorized ElevenLabs clone.

## Alternate source review

Source: `https://drive.google.com/file/d/1Ve9Hxc7MmyLzC1HgcjaOnVBGkYnj8LqM/view?usp=drivesdk`

The alternate public video is accessible by byte-range, allowing targeted audio extraction without downloading the full file. ElevenLabs Scribe v2 diarization of minutes 0–5 detected only a recorded song beginning around 3:36, with no spoken interview voice. A second diarization covering source minutes 5–15 also detected only songs and singing. No verified Mekiel speaking interval occurs in the first fifteen source minutes, so these intervals must not be used to train the replacement clone. The earlier rejected preview was therefore based on non-Mekiel source audio and is invalid.

## Existing ElevenLabs history review

The authenticated ElevenLabs Text to Speech history contains an existing voice named `Mekiel Mitchell — Verified Audiobook Voice`. Multiple audiobook sections were generated with this voice on August 22, 2026, including numbered chapters, bonus resources, the 30-day funding action plan, and closing credits. The inspected closing-credit generation uses the `Eleven v3` model with `50%` stability. A long-form chapter/bonus generation also uses the same verified voice family. This history configuration is distinct from the two newer rejected `Authorized Audiobook Preview` clones and should be treated as the leading approved-voice candidate.

### Exact comparison

| Candidate | Voice | Model | Settings exposed by ElevenLabs | Outcome |
|---|---|---|---|---|
| Existing August 22 history | `Mekiel Mitchell — Verified Audiobook Voice` | `Eleven v3` | Stability `50%`; Eleven v3 history exposes no speed, similarity, style, or speaker-boost controls | Leading authentic-history candidate; existing sections include chapters, bonus material, action plan, and closing credits |
| Rejected preview 1 | `Mekiel Mitchell — Authorized Audiobook Preview` | `Eleven Multilingual v2` | Speed `0.95`; stability `55%`; similarity `80%`; style `5%`; speaker boost enabled | Rejected by user as not Mekiel |
| Rejected preview 2 | `Mekiel Mitchell — Authorized Audiobook Preview v2` | `Eleven Multilingual v2` | Speed `1.0`; stability `50%`; similarity `75%`; style `0%`; speaker boost enabled | Rejected by user as robotic |

The meaningful differences are the underlying voice identity and `Eleven v3` rendering model, not a racial or demographic style setting. The August 22 history voice must be user-approved from an existing downloaded sample before any additional audiobook generation.

## User approval

The user approved the downloaded August 22 closing-credit sample as Mekiel Mitchell’s correct voice and also approved the other history files that use the same `Mekiel Mitchell — Verified Audiobook Voice`. Existing Group Home Funding Playbook history audio should therefore be inventoried and reused. New narration should be generated only for script sections proven missing from the approved history set.

## Approved history inventory

The official ElevenLabs history API returned **34** MP3 files using the approved voice ID `WMA0bMfkpNGQzlsjBFRt`, all generated with `Eleven v3`, `50%` stability, and `mp3_44100_192` output. The archive downloaded successfully. Three pairs are exact duplicate narrations: Chapter 1, Chapter 6, and the “Momentum Attracts Capital” continuation, leaving **31 unique narration files**.

Normalized eight-word sequence analysis against the supplied narration script found 95.3%–100% coverage for the opening/dedication, introduction, all twelve chapters, and bonus resources. The generated closing credits are shorter/materially different from the current script’s closing-credit wording and require content review before final assembly. An extra 630-character promotional intro is not part of the supplied script and should not be included automatically.
