# Initial local data contract

This document describes the v0.5 local format and shared-setup contract. See [Phase 3B](PHASE_3B.md) for the separate case exchange contract.

## Project configuration

JSON object with `id`, `name`, `route`, `demonstration`, `alignment`.

```json
{
  "id": "TRAINING-ONLY",
  "name": "Invented training project",
  "route": "Example section",
  "demonstration": true,
  "alignment": [
    { "lat": 4.0, "lon": 112.0, "chainage": 0 },
    { "lat": 4.01, "lon": 112.01, "chainage": 1500 }
  ]
}
```

Coordinates are WGS84 degrees. Chainage is metres and increases along the alignment. Native configuration imports and SDR setup.json are supported; KML/KMZ and complete SiteBoard settings/backup files are not supported inputs.

SDR input uses `centreline: [[longitude, latitude, chainage], ...]`. The adapter converts to named fields, sorts by chainage, warns on identical duplicates and rejects different coordinates at the same chainage. No points are silently discarded. Invalid ranges, zone gaps/overlaps, duplicate source IDs and invalid coordinates reject the import without writing.

An SDR setup without a centreline creates a chainage-only project with an empty alignment and explicit declared range. An observation outside coordinate coverage can remain in the declared project range; it will not be assigned a fabricated geographic position.

Optional `shared` configuration uses `schemaVersion: siteboard-project/1` and includes agreed `projectKey`, original project code/title and contract, source version, import time, coordinate/chainage/side conventions, declared range, zones, team sections, structures and activities. Source structure/activity IDs are retained. Optional `setupHistory` stores previous configuration/geometry snapshots after reviewed updates (up to 100); it travels in backups and native configuration exports.

The local `id` identifies this browser workspace. `shared.projectKey` identifies the contract/package across devices. The shared ID is taken from optional source `sharedProjectId`, or suggested from project code and a hash of the contract number; a user must review it. A missing contract number produces a warning. Source code/title alone must not silently merge workspaces.

`setupRevision` and `alignmentRevision` are SHA-256 digests of canonical configuration values, excluding local UUID, local display name, import timestamp and list order where order is not meaningful. They are content fingerprints, not digital signatures. The canonical source title is stored separately as `shared.projectTitle`, so a restored local display label does not invalidate the source revision. Native reimports validate current and archived revision hashes.

Zone boundaries follow existing SiteBoard behavior: first inclusive matching zone. Team sections follow SDR behavior: start inclusive/end exclusive, except the final endpoint belongs to the final section. LHS/RHS is relative to increasing chainage; FieldTrace's Centre label corresponds to SDR CL. Phase 3A does not change observation side storage or source application code.

## Observation

Permanent UUID, project ID, readable reference, title, description, category, priority, chainage, side, optional GPS coordinates and accuracy, location source, responsible party, due date, reporter, creation/update times, status, original photo attachments and event history. Each follow-up event can contain its own `photos` array. Older history entries without photos remain valid. Dates use YYYY-MM-DD; event times use ISO UTC. Device-local date is used for due-date assessment.

Statuses: Reported, Action taken, Monitoring, Closed. A closure needs a prior action/monitoring state, author and note. Pilot actor names are statements, not authenticated identities.

New observations in shared projects also store `projectContext`: shared project key, setup/alignment revision at capture, optional source asset ID and source activity ID. Historical records are not retagged when the setup changes. Existing legacy observations remain valid without this context. Asset identity for exchange is the pair `(projectKey, assetId)`, never an asset name by itself.

## Backup

New exports use `schemaVersion: fieldtrace-backup/5`, `exportedAt`, `project`, `observations`, `drafts`. Versions 1–5 are readable. Version 5 protects SDR event references from silent stripping by older apps; version 4 introduced permanent sourceId. Original photographs remain in observation `photos`; action and verification photographs are stored on the corresponding history event. A photo contains its local ID, filename and image data URL. Up to eight photographs per event, each at most 8 MB at file selection.

Validation rejects unsupported versions, inconsistent history status, out-of-range chainage, cross-project references, duplicate observation/draft IDs and orphan draft references. Restore uses one atomic transaction and creates a separate project with new internal observation IDs. Restored observations retain `sourceId` (the prior sourceId or original UUID), so re-exporting a recovered case does not create a second case in SiteBoard. Follow-up draft references are remapped; readable observation references remain historical labels. Existing projects and records remain intact.

## Drafts and database upgrade

IndexedDB database name remains `fieldtrace-v1` to retain existing records. Database schema 2 adds a `drafts` table without clearing version 1 stores. Draft IDs are `observation:<projectId>` or `followup:<observationId>`. Drafts contain incomplete field strings, photographs and an updated time; they are not submitted observations. A submit transaction commits the observation and deletes only its draft. Follow-up submit checks the expected observation revision inside the transaction.

## Case exchange

`fieldtrace-cases/2` carries a permanent case UUID, complete history/photos, capture context and geometry, source asset/activity names, SHA-256 case/package revisions and a checked attachment manifest. The record projectId is the shared project key; source local project IDs never control merging. Drafts are excluded. Source records remain owned by FieldTrace. SiteBoard stores accepted envelopes, import provenance and conflict archives in a separate per-workspace IndexedDB meta entry. Version 1 remains readable for packages without SDR references. New event fields kind: sdr-link and evidenceRefs retain report/item/PDF identity. See [Phase 3C](PHASE_3C.md) for references and [Phase 3B](PHASE_3B.md) for case review/recovery rules.
