# Phase 4 — Android and iPhone field pilot

FieldTrace v0.6.0 pilot candidate; SiteBoard v0.12.0. This phase is **in progress**. Local validation and the pilot materials can be completed here; physical-phone and field acceptance require the actual devices and users. A successful desktop trial is not an Android/iPhone result.

## Start the trial

1. Select one IOW, one engineer and a coordinator/case owner. Start with invented data, then a small agreed section. Keep one authoritative FieldTrace workspace per case; file exchange is not live synchronization. Recorded names do not authenticate contractual approval.
2. Serve the checked static release at an approved HTTPS address. The desktop localhost address is not a phone address. The public host receives program assets only; actual setup, photos, PDFs, cases and backups stay in private folders/browser storage.
3. On Android use Chrome; on iPhone use Safari for the initial trial. Record the actual model, OS and browser version. Installation/home-screen options vary: follow [Chrome's web-app instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en) and [Apple's iPhone web-app guide](https://support.apple.com/en-lb/guide/iphone/iphea86e5236/27/ios/27). HTTPS is the public-host baseline; see [Chrome's HTTPS guidance](https://developer.chrome.com/docs/lighthouse/best-practices/is-on-https).
4. Open the release online and wait for **Application available offline**. Import the same authoritative shared setup used in SiteBoard, confirming project identity and chainage. The app does not download an external basemap.
5. Open **Project data → Open Android & iPhone pilot worksheet**. Enter a run ID and coordinator code, not sensitive project details. Worksheet results are separate from project backups. Save locally and download JSON after each session.

## Bounded first trial

Complete one case on each phone before expanding to three. Use one original, one action and one verification photograph per case, initially around 1–2 MB each. Include a separate high-resolution 4–8 MB supported-image trial. Keep the first complete backup below 60 MB so the 100 MB file limit has headroom. These are trial bounds, not a claimed maximum capacity. Base64 images increase JSON size; repeated event photos accumulate. The app does not resize original attachments.

Have the engineer review and record verification after the IOW's observation and the recorded corrective action. Retain source SDR PDFs beside evidence reports. Source references identify documents/items; they do not copy those photographs into FieldTrace.

## Required checks on both phones

The worksheet has 11 checks per platform. Ten are critical; installation/home-screen convenience is optional, but offline reopening is critical.

| Area | Pass evidence |
|---|---|
| Touch/keyboard | All capture and follow-up controls reachable; phone-width register/history readable; no lost fields when the keyboard opens. |
| Draft | Saved original photo and fields survive closing and browser restart. |
| Offline | With networking disabled after first load, reopen and submit a case and follow-up. |
| GPS | Permission allowed/denied, poor signal/accuracy and manual fallback are understood. Confirm chainage and side against the approved alignment; phone GPS is contextual, not survey acceptance. |
| Media | Camera/library behavior recorded, valid large image retained, invalid/unsupported input rejected while existing photos remain. HEIC is not an accepted file format in this release; record what the device picker actually supplies. |
| History | Original/action/verification evidence remains distinct after reopening; a source-reference link does not change status. |
| Reports | Every chosen photo, long note, author/time and source locator appears without clipping in the saved output. |
| Exchange | Private transfer to desktop SiteBoard, duplicate reimport, source-reference retrieval and revised/missing-source messages work. Legacy SDR state stays independent. |
| Recovery | Downloaded backup restores separately with matching case/photo/draft/link counts; source IDs remain stable on re-export. |
| Interruption | Lock/background/call or app switching does not lose saved evidence; any unconfirmed input is identified. |

Record failures as failures or blocked checks, never as a pass based on a desktop simulation. Do not deliberately exhaust a production phone's storage. Real storage-pressure behavior belongs on a disposable test profile/device with downloaded recovery copies.

## Measure whether the tool helps

Time comparable tasks with the previous workflow and FieldTrace, using the same evidence volume and scope. Record seconds and a case/sample code. Gather at least three FieldTrace timings for Capture, Report and Retrieve on each platform. Follow-up and restore timings are optional additional measurements.

The worksheet reports raw sample counts and medians. Baseline comparisons use only paired measurements from the same rows; missing values are not zero. Positive percentage change means less time, negative means more time. No productivity improvement is prefilled. Retain raw samples and explain differences rather than treating a small trial as a general performance claim.

## Acceptance gate

- Any critical failure stops expansion until corrected and retested.
- Every critical check must pass on both platforms. Pending, blocked or not-tested does not pass.
- Record model/OS/browser, run/date/owner and sufficient timing samples.
- Review any optional installation failure and record the operational decision.
- The IOW and engineer must complete a case and its usable evidence output, recover it, and retrieve the supporting SDR reference where used.
- A human reviewer decides acceptance. The worksheet only indicates readiness for that review; Phase 4 is not complete until actual field results and that decision are recorded.

Keep each device's private JSON result and backups outside the repository. The blank worksheet is safe public application code. Pilot JSON/CSV output must not be published with it.

## Local validation scope

The automated suite includes simulated IndexedDB write/delete failures and restore rollback. A synthetic trial uses six cases, 18 submitted photographs and a draft photograph, each image about 1.18 MB, with a roughly 30 MB recovery JSON. Recovery and re-export verify photos, history and permanent source IDs. Timing in the ignored .qa/phase4-local-validation.json is from desktop/in-memory IndexedDB, not a phone benchmark.

Browser validation uses a separate production-preview origin and invented records. Server-stopped reopening demonstrates cached application retrieval on that desktop browser; it does not simulate phone radios, OS suspension or real storage exhaustion. Narrow desktop frames check layout width only.

## Packaging and later work

Run pnpm test, pnpm build, then Python scripts/package_pilot.py. The packaging script allows only static dist assets, adds non-project deployment notes and produces a SHA-256 alongside the archive. It copies no QA data or project files. Upload/deployment is a separate action; no hosting change is made in this phase.

After recorded field acceptance, Phase 5 selects two concrete inspection templates and their outputs. Do not infer field acceptance from completion of the local development checks.
