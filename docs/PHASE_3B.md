# Phase 3B — private case exchange

FieldTrace v0.4.0 and SiteBoard v0.11.0. This is manual, one-way transfer of submitted cases. No server, account or automatic synchronization is introduced.

## Workflow

1. Import the same authoritative SDR setup.json into both apps. Review FieldTrace's shared project key. If an explicit key is needed, put the agreed sharedProjectId in the SDR setup used by both apps.
2. Record observations, actions and verification in FieldTrace. Preserve original/event photographs.
3. Open Reports → Export cases to SiteBoard, choose cases, and download the private JSON package. Drafts are excluded; legacy cases without shared capture context cannot be exchanged.
4. In the correct SiteBoard workspace, open FieldTrace cases → Import FieldTrace case package. Review project identity, range, alignment and operations. Nothing is written during preview.
5. Compare both histories and photographs for any conflict. Keep current is the default. Accepting incoming archives the entire prior accepted version and its provenance.
6. Confirm the reviewed import. Use the source case drawer, period/status/search filters, selected-case PDF or Word report, CSV, or separate map layer. Chainage-only cases remain in the register even without a map point.
7. Record later actions in FieldTrace, then export/import again. SiteBoard does not edit or send statuses back.

## Useful outputs

- Register: location, priority, responsibility, due date, status through period end and evidence count.
- PDF/Word case evidence report: original description, action history, original/action/verification photographs and source provenance.
- Weekly/monthly reports: optional separate FieldTrace section and optional event photographs; SDR reporting compliance and work quantities remain unchanged.
- Map: source geometry with separate green case markers; GeoJSON/KML includes explicit source and case identity. Coverage/category/reporter statistics remain SDR-specific. Basemap requests follow SiteBoard's existing map selection; select No basemap (plain) for a local-only map.
- Separate FieldTrace inbox backup: complete accepted cases, photographs, conflict archives and import audit. The ordinary SiteBoard settings backup does not contain these.

Period reports use device-local dates, preserve open backlog, and show only history through the cutoff. Closed cases are included when an event falls in the period. The case drawer shows the latest full source record; its status can therefore be later than a historical period view.

## Exchange contract

Schema fieldtrace-cases/1 includes package UUID, export time, source application/version/local workspace, shared project identity/range/current alignment and revision, case envelopes, attachment manifest and package content digest.

Each envelope includes permanent caseId, record (projectId becomes shared project key), geometry captured using its original setup snapshot, optional source asset/activity labels and revision. GPS coordinates are preserved. A chainage-derived point uses the capture alignment and does not imply a surveyed lateral offset. A missing capture snapshot blocks export.

Canonical recursively sorted JSON is SHA-256 hashed for envelopes/packages. Setup/alignment digests keep the Phase 3A canonical convention. Attachment manifests identify case/event/photo, original filename, MIME, decoded byte count and SHA-256 of the image data URL. Digests detect corruption; they do not authenticate the author or provide a digital signature.

SiteBoard requires an imported SDR setup with matching project code, contract, chainage range and current alignment. Explicit/shared binding mismatches are blocked. The first reviewed import establishes the shared key for that workspace. Cases do not install a different setup.

An identical case revision is a duplicate. A strictly appended history with unchanged original evidence/metadata advances the case; a shorter matching history is stale. Divergent history or changed original evidence is a conflict. Partial packages never delete omitted cases. Reused package IDs with changed content are rejected. Every confirmed import is logged, including repeats; accepted source envelopes retain package provenance. Conflicting replacements retain up to 30 prior revisions. The pilot stops at 2,000 audit entries, 10,000 cases or 95 MB per inbox, and 100 MB per file rather than silently discarding evidence.

## Recovery and maintenance

Keep exchange files, recovery backups, actual setup and photos outside source folders and GitHub. FieldTrace backups now use fieldtrace-backup/4; versions 1–3 remain readable. Restored copies get new local IDs while retaining sourceId, so they still address the original SiteBoard case.

To restore SiteBoard cases, create a separate empty workspace, import the same SDR setup, then restore the dedicated inbox backup and review its destination. Existing cases are not overwritten by recovery. Store settings backups and source SDR reports separately. Workspaces, imports and backups remain local and unencrypted.

The portable runtime validator in src/exchange/case-contract.js is mirrored in SiteBoard js/fieldtrace-contract.js. Change both together; the linked-workspace regression checks compare their contents. Both apps build independently. The cross-app tests automatically skip when the sibling repository is absent.

## Validation boundary and next phase

Automated checks and synthetic browser import/report/map checks are complete. Physical phones, camera/GPS, large datasets, storage exhaustion and real field acceptance remain Phase 4 checks. No GitHub push or deployment was performed.

Phase 3C links original SDR report/photo references to cases without creating duplicate observations, and defines the treatment of SiteBoard's legacy SDR observation follow-up. Legacy migration is not part of Phase 3B.
