# Verification — 31 October 2026

## v0.6 / Phase 4 local preparation

- 60 automated tests pass. Four simulated IndexedDB failures verify saved-draft retention, failed-submit retention, rollback when draft deletion fails after the observation write, and whole-restore rollback. These do not constitute a real browser quota-exhaustion test.
- A synthetic in-memory recovery trial restores six cases with 18 submitted photographs plus one unfinished draft photograph. Each generated image is about 1.18 MB; backup JSON is 29,915,566 bytes. History, original image data and permanent IDs survive recovery/re-export. Desktop timing is in ignored .qa/phase4-local-validation.json and is not a phone performance claim.
- Worksheet tests cover blank/no-pass initial state, two-device acceptance prerequisites, failed/blocked critical checks, missing device details, paired medians, negative time changes, malformed data rejection and private project-field exclusion.
- Browser: production origin 4180 reached Application available offline. Stopped its owned preview process and reloaded both the main app and pilot worksheet successfully from the cached shell.
- Browser: with that server stopped, saved a draft with a 1.18 MB synthetic image, closed/reloaded, recovered fields/photo, submitted, recorded action/closure, and viewed the complete evidence preview.
- Downloaded the browser backup with the server stopped. Its six synthetic cases, closed trial, three history events and original image bytes were verified from the downloaded file. Separate-copy browser restore was not rerun in this phase; automated recovery tests and earlier browser recovery checks remain available.
- The worksheet navigation check exposed a service-worker bug that returned the SPA index for a named HTML page. The worker now serves allowlisted page assets directly, with a GitHub-subpath/query regression check.
- Browser worksheet checks: synthetic timing input persisted after reload, the paired 120/90-second example showed 25% reduction, and the visible JSON retained both durations while both phone offline checks stayed pending. The synthetic row was then removed and a blank/pending worksheet left for the real trial. This example is not a productivity finding.
- Desktop narrow-frame visual review: worksheet and FieldTrace phone layouts at 390 px, with a 768 px tablet frame for comparison. This is a layout review, not mobile-browser emulation or a physical-device result.
- Physical Android/iPhone camera, GPS permissions/accuracy, keyboard and suspension behavior, actual network loss, storage pressure and human field acceptance are pending. All physical worksheet checks remain unclaimed.
- Production typecheck/build/release-boundary checks pass. Pilot archive includes static assets and blank worksheet only; private QA files, results and project backups are excluded. No deployment.

## v0.5 / Phase 3C

- 49 automated tests pass, including project agreement, reference package integrity, wrong-project/duplicate/unknown-field rejection, raw-PDF identity resolution, append-only status-preserving links, case schema 1/2 compatibility, version 5 recovery and exclusion of future links from historical periods.
- Portable reference validators are compared across the two repositories, allowing only their case-contract import path to differ.
- Browser scanner integration: 8 checks passed using an invented PDF parsed through the actual SDR scanner. Source byte fingerprinting, source metadata, reference export and changed-file rejection were exercised.
- Browser round trip: source reference package downloaded, previewed and linked to the existing synthetic FieldTrace case. Status remained Reported. Exported case schema 2 was previewed and accepted in SiteBoard, where the source fingerprint/item matched the retained SDR report.
- Browser legacy follow-up: the synthetic SDR row shows its linked FieldTrace shortcut with an independent legacy state.
- Existing SiteBoard checks rerun successfully: 24 resilience checks, 15 browser project-configuration checks and 29 browser evidence checks, including PDF/Word rendering.
- Case/period report models retain source locators, review event and full PDF fingerprints; SDR images are not copied into FieldTrace.
- Production TypeScript/build, generated shell and release privacy-boundary check passed. The help guide is rebuilt with the pinned local Markdown builder.
- No source SDR application edits, GitHub push or deployment. Physical-phone and larger-data field validation remain Phase 4.

## v0.4 / Phase 3B

- 42 automated checks pass, including source export, attachment integrity, stable identities after two restores, captured alignment snapshots, no-context rejection and chainage-only cases.
- Linked-workspace checks cover identical portable contracts, preview without writes, atomic concurrent-import rejection, duplicate/update/stale/conflict classification, partial packages, explicit conflict archives, project/alignment mismatch, package-ID reuse and recovery validation.
- As-of-period report tests exclude future history and historical closures outside scope, while retaining open backlog.
- Browser: imported synthetic SDR setup and case package into local SiteBoard, reviewed before committing, and verified a separate register with two photographs, provenance and import audit.
- Browser: PDF and Word evidence downloads succeeded; PDF page 2 visually reviewed with Poppler, and Word archive contains media and the follow-up text. FieldTrace map layer shows one case separately from zero SDR work items.
- Existing SiteBoard project configuration browser checks: 15 passed. Existing resilience tests: 24 passed. Existing synthetic evidence browser checks: 29 passed, including PDF/Word; statistics browser checks: 20 passed. Weekly report built with the FieldTrace section enabled. FieldTrace export dialog prepared a real synthetic local case package.
- SiteBoard source changes are confined to integration/storage/report/map/UI support and generated documentation/offline shell. No source SDR app changes or deployment.

## v0.3 / Phase 3A

- Setup adapter tests cover coordinate order, stable shared/source IDs, canonical revisions, declared range versus coordinate coverage, chainage-only projects, duplicate/invalid source rejection and native configuration integrity.
- Storage tests cover explicit repeated-import no-op, separate local copies, alignment changes with historical context retained, archived configuration snapshots, backup/restore of shared identity/history, stale-source rejection and protection of referenced assets/activities/drafts.
- In this combined workspace, a compatibility test invokes the existing SiteBoard importer on the same invented SDR setup and checks identity, structures, centreline and zone boundary agreement. The test automatically skips when the sibling SiteBoard source is absent, so the separate FieldTrace repository stays independently buildable.
- Browser: downloaded the invented SDR example, reviewed the preview, confirmed import and inspected shared metadata and master-list counts.
- Browser: created an observation with the imported bridge/activity IDs; its case displayed the shared project key and capture revision.
- Browser: reimported the same file, explicitly selected the existing project and confirmed the unchanged revision. The original local workspace, import time and single observation remained intact; no extra workspace or case was created.
- No existing SDR/SiteBoard source was edited. Only synthetic data was imported into the browser.

## v0.2 implementation checks

- Strict TypeScript typecheck, Vite production build, generated shell and release-boundary check.
- Domain validation tests plus IndexedDB API tests using an isolated in-memory implementation.
- Database schema 1 to 2 upgrade retains original records and photos.
- Draft fields and attachments persist; committing removes only that draft.
- Backup JSON round-trip preserves original/action/verification photographs, history and unfinished drafts. Restore creates new project/record IDs and leaves the original intact.
- Invalid restores are rejected before adding a project. Stale case revisions are rejected while their draft remains available.
- Generated worker supports the GitHub repository subpath, cached navigation and module requests with Vary headers. Requests outside the app are not intercepted.

## Browser checks passed

- Existing v0.1 demonstration records remained available after the upgrade.
- Observation draft survived save/close and page reload; follow-up notes recovered on reopening the case.
- Production shell reached **Application available offline**.
- Stopped the owned production preview server and reloaded: the alignment and saved records rendered from the shell/database.
- With that server stopped, created a new case with a synthetic original photograph, recorded action with another photograph, and closed it with a verification photograph.
- Evidence preview contained one closed case, three photographs, separate stage captions and complete history.
- Downloaded a backup through the UI and restored through the UI with the server stopped. Restored copy showed six observations and three photographs; original remained selectable.
- Reviewed desktop layout. Mobile controls have larger touch targets and 16 px entry text; physical-device checks remain below.

An early browser offline check exposed a module-cache mismatch. The worker was corrected; server-stopped reopening and the photographic case then passed.

## Remaining before broader field use

- Physical Android/iPhone camera, GPS, installation and suspension behavior.
- Large photographs and multi-page print/PDF pagination on target browsers.
- Update-button behavior across a real deployed release.
- Storage exhaustion, larger datasets and full accessibility audit. Stale submitted-case protection is implemented; simultaneous editing of one unfinished draft is not supported.
- GitHub Pages deployment: prepared; no repository created or pushed.
- SDR report/photo linking: Phase 3C; manual FieldTrace → SiteBoard exchange is available.

Only invented records, alignment and generated image fixtures were used. No actual project data was imported or uploaded. A synthetic trial backup was downloaded to the browser's normal Downloads folder.
