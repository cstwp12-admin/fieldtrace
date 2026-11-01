# Implementation plan

## Product boundary

SDR captures a person's daily photographic report. FieldTrace manages observations and inspections at locations over time. SiteBoard consolidates project monitoring and reporting. A source photo can be linked across the applications; it must not become a second unrelated event.

## Phase 0 — Contract and output design

Working brand: FieldTrace. Trademark and domain clearance are not completed. Agree the observation card, action register, closure evidence and project exchange schemas. Retain compatibility with SDR setup.json before changing master-data administration. Decide migration of SiteBoard's existing follow-up records before assigning observation-status ownership to FieldTrace.

Deliverable here: initial local schema, synthetic demo, working report and these implementation notes. Shared integration contract still needs mapping against current SDR and SiteBoard records.

## Phase 1 — Local foundation

Implemented through v0.2: project creation/import, local alignment display, GPS, chainage search, IndexedDB migration, backup/restore with drafts and event evidence, persistence request, generated offline shell and waiting-update control. Browser verification includes reopening with the server stopped and recovery into a separate project. Next: project-package adapters and target-phone restart/restore tests. Exit: records and attachments survive an offline restart and restore on the target phones.

## Phase 2 — Observation pilot

Implemented through v0.2: create observation, original/response/verification photographs, review/closure history, separate evidence report preview, CSV register, recoverable observation/follow-up drafts, dialog focus containment and stale-revision rejection. Browser verification includes a full photographic case while the preview server was stopped. Next: physical-device usability, larger photo-report pagination and agreement on actor/acceptance policy. Exit: an IOW and engineer complete a real case and its closure report without duplicate entry. v0.2 is a pilot candidate, pending device checks.

## Phase 3 — Integration

SDR evidence references, configuration adapter, versioned packages with attachments, SiteBoard import preview, deduplication, conflict review and focused-report inclusion. Exchange is manual import/export first. Repeated imports must not create duplicate cases. A backup is not a synchronization package.

### 3A — Shared project setup (implemented in v0.3)

SDR setup adapter, confirmation preview, separate local/shared identity, deterministic revisions, zones/sections/master lists, source structure/activity links at capture, safe reviewed updates and prior setup snapshots. Chainage-only operation is supported when no centreline exists. Existing SiteBoard importer compatibility is checked with the same synthetic file. No existing app sources were changed and no case exchange was added.

### 3B — FieldTrace case exchange (implemented in v0.4 / SiteBoard v0.11)

Versioned case/attachment package, SiteBoard import preview, stable-ID deduplication, revision conflicts and provenance. Bring cases into the existing map, registers and report selection. Keep recovery backups separate from exchange files. Implemented with explicit project binding, attachment digests, append-only update detection, reviewed conflict archives, a separate register/map layer, CSV, PDF/Word case reports and optional weekly/monthly report sections. Physical-device and larger-data validation remain in Phase 4.

### 3C — SDR evidence links (implemented in v0.5 / SiteBoard v0.12)

Versioned SDR references use project key, report reference, numbered item, optional source photo-page locator and SHA-256 of the actual PDF. SiteBoard exports metadata references; FieldTrace previews and adds selected references as an append-only event without changing status. Case exchange, backups and reports preserve links. SiteBoard resolves matched/missing/revised sources and shows legacy-to-case shortcuts. Legacy states remain independent; no status migration is performed. Explicit status migration remains a future design decision. See PHASE_3C.md.

## Phase 4 — Field validation (started; v0.6 pilot candidate)

Small project section and a few IOW/engineer users. Measure capture time, report preparation time, repeated data entry, evidence retrieval and restore success. Test GPS denial, poor accuracy, weak connection, large photos and storage failure. Assignments are recorded data until a delivery service exists. Local preparation includes the Android/iPhone results worksheet, measured-task comparisons, storage-failure simulations, roughly 30 MB synthetic photographic recovery, production offline checks and a code-only pilot release package. Physical-device and IOW/engineer acceptance remain pending; see PHASE_4.md.

## Phase 5 — Inspections and assets

Select two common inspections, outputs and acceptance process. Asset history and links to specialist tools follow. Avoid rebuilding specialist engineering calculations without a defined need.

## Phase 6 — Spatial expansion

Lines/polygons, surveillance sessions, inspection coverage and progress by chainage. Distinguish travelled route from observed/inspected area. Trial foreground route recording on target phones before promising locked-screen operation. Assess map-provider licensing before any offline tile downloads.

## Phase 7 — Shared service

Assess authenticated accounts, private storage, organization permissions, delivery, server audit and conflict handling only after local value is proven. GitHub continues to host static application code; private project storage is a separate approved service.

## Release gate

Typecheck and build, domain contract tests, real browser checks, source and dist review for project information, backup/restore trial. Public releases contain application assets and synthetic examples only. Keep dependencies locked. Existing SiteBoard stays on its own release cycle.
