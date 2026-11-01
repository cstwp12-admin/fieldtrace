# Phase 3C — SDR evidence references

FieldTrace v0.5.0 and SiteBoard v0.12.0. Existing cases can reference source SDR items without copying daily records or source photographs.

## Practical workflow

1. Use the same shared SDR project setup in both apps. In SiteBoard reconnect/refresh the reports folder or reimport the source PDFs. Older cached reports need re-reading to acquire a file fingerprint.
2. Export a reference from a report drawer item, the legacy Observations row, or FieldTrace cases → Export SDR reference package (current period). The last option includes all source items in scope, independently of case search/status filters.
3. Open the relevant FieldTrace case and choose Import SDR references. If no case exists, create the observation normally first. A source item may support several different issues; importing never creates a case automatically.
4. Preview source report reference, item number, photo page when available, date, reporter, activity, location, remarks and PDF digest. Select up to 20 references, enter your name and review note, then confirm. Preview/cancel makes no changes. Finish or discard any unfinished action draft first.
5. FieldTrace appends an evidence-link event while retaining the case status and original photographs. Repeated links to the same PDF/item within one case are blocked. Revised PDFs are distinct evidence versions and can be added with a new review note.
6. Export the updated case package and import it in SiteBoard. The case drawer lists references and resolves them against loaded reports. Matching reports can be opened after source-file verification. Missing, ambiguous, unverified and revised reports are explained; no link is silently retargeted.

## Meaningful outputs

FieldTrace's printable evidence report and SiteBoard PDF/Word case/period reports include source report/item/photo-page locators, PDF fingerprints and the review event. The original SDR PDF remains the photograph evidence container. Keep it with the case evidence report when sharing a complete record. These references do not make case reports self-contained copies of SDR photographs.

SiteBoard's legacy Observations list shows linked FieldTrace references/statuses and case shortcuts. Its own saved follow-up state remains independent and labelled as legacy. No old closure is converted into a FieldTrace verification or vice versa. SDR submission/compliance, work quantities and photo coverage remain SDR-specific.

## Identity and validation

SDR presently exposes a report reference and numbered item rather than a permanent photo UUID. The locator is (shared project key, report reference, item number, source PDF SHA-256), with an optional photo-page locator. The raw PDF digest detects revisions including image-only changes. A snapshot digest covers the retained source metadata. Relative filenames and machine paths are not exchanged.

SiteBoard fingerprints bytes before PDF parsing, retains the digest in its parsed cache, and rechecks the source File before exporting references or opening a matched report. Cached metadata alone is insufficient for a fresh export. Source digests detect changes, not author identity, contractual approval or authenticity.

Reference packages use siteboard-sdr-references/1, package UUID/export time/project key, checked reference array and package digest. FieldTrace enforces 5 MB, 10,000 references per preview and 20 selected links per event. Unknown reference fields, wrong projects, damaged snapshots/packages and duplicate locators are rejected. Links are validated again before local commit/recovery.

New case exports use fieldtrace-cases/2; version 1 remains readable when it carries no references. Older SiteBoard versions reject schema 2. New FieldTrace backups use fieldtrace-backup/5 (versions 1–4 remain readable), so older FieldTrace cannot silently strip links. SiteBoard inbox backups use schema 2 and accept schema 1 recovery.

The runtime reference validator is mirrored between the separate repositories, with only its case-contract import path changed. Linked-workspace tests check parity. No live synchronization, source-photo extraction in FieldTrace, automatic case creation, legacy status migration or authenticated roles are introduced.

## Release and next phase

Public GitHub hosting remains application code only. Keep actual SDR PDFs, reference packages, case packages, project setup and backups outside the source repositories. No deployment is part of this local phase.

Phase 4 is a small field pilot: physical-phone capture and offline recovery, evidence retrieval with disconnected/revised PDFs, practical reporting output, larger datasets and storage limits. Agree the authoritative case owner and source-document retention routine before routine use.
