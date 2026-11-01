# Phase 3A — shared project setup

FieldTrace v0.3 reads the same **private SDR setup.json** that SiteBoard currently imports. This phase establishes project and source IDs; it does not send cases to SiteBoard or import daily SDR reports.

## Start

1. Obtain the authoritative SDR setup.json from the project administrator. Keep it outside the source repository.
2. Open **Project data → Import SDR setup / configuration** (also available on the welcome screen).
3. Review project code/title, contract, range, coordinate coverage and master-list counts. Check all warnings.
4. Review the **shared project ID**. Use an agreed ID consistently across devices for the same contract/package. A suggested ID is not proof that two projects are the same.
5. Choose a separate local project or explicitly select a matching existing project to update.
6. Confirm the review checkbox and apply. Cancellation writes nothing.

Use **Download synthetic SDR setup** to explore with invented information. The regular demonstration project remains available. No live project profile is bundled.

## What comes across

- Original project code/title, contract number and setup version.
- Declared chainage range, zones and team sections.
- WGS84 centreline, converting `[longitude, latitude, chainage]` to named fields.
- Structure IDs, names, type, drawing chainage and optional side.
- Activity IDs, category codes, English/Malay names and BQ reference text.
- Team codes only. Logos, people, private settings and unrelated fields are not retained.

Open the master-list sections under Project data to inspect the imported values. The map shows structures at indicative drawing chainages when coordinate coverage exists. Selecting a structure in an observation retains its ID but does not overwrite the observed chainage. Selecting an activity retains its source ID; it does not imply acceptance of work.

## Range and location rules

The declared project range remains authoritative even if the centreline stops a small distance short. Uncovered chainages can be recorded but are not mapped. Empty centreline means chainage-only mode: observations, zones, source IDs and reports work; geographic map placement and GPS-to-chainage are unavailable. The app never invents a connecting line for an absent alignment.

Invalid or ambiguous source entries are rejected instead of silently removed. Identical coordinate duplicates are removed with a warning. FieldTrace is stricter than SiteBoard's legacy normalizer on malformed entries, duplicate IDs and structures outside the range; correct these in the authoritative source file before importing.

Zones use the first inclusive match, as in SiteBoard. Team sections use SDR's start-inclusive/end-exclusive convention with a final-endpoint exception. LHS/RHS follows increasing chainage; Centre corresponds to SDR CL.

## Identity and revisions

The local workspace UUID is distinct from the shared project key. Two local copies may represent the same shared project. Structure/activity source IDs remain case-sensitive. A missing activity ID receives a deterministic legacy ID with a warning; renaming an ID-less source activity can change its identity.

The importer suggests a shared key from project code and contract number, or reads the optional source `sharedProjectId`. Review it explicitly. Titles, names and source version numbers are not used to silently merge projects. Agree a unique code/contract or explicit shared ID where separate packages would otherwise collide.

Each import has a content-based setup revision and alignment revision. Observation context preserves the revisions used when the observation was submitted. Hashes detect content differences; they do not authenticate the author.

## Updating an existing project

Reimport the source, select the matching existing workspace and review the differences. The same revision is a no-op. A changed revision keeps all observations, photographs, history and drafts, and archives the previous configuration and alignment. New records use the current setup; historical context is retained.

Updates are blocked if they exclude a saved observation/draft chainage, remove a source ID used by a record/draft, change contract/project identity, or race with another setup update. Preserve referenced IDs in the source, finish affected drafts, or import separately. An open observation form also checks that its setup is still current when submitted.

Up to 100 prior setup snapshots are retained per project; a full archive blocks another update rather than deleting earlier revisions. Large setups and archives are subject to the existing local-file and backup size limits.

## Exports and privacy

**Export configuration** produces a FieldTrace configuration with shared metadata and setup history. It can be imported by FieldTrace; it is not a replacement SDR setup or SiteBoard case package. Use the authoritative SDR setup file for the existing SDR/SiteBoard apps.

Complete backups now use version 3 and retain source identity, setup snapshots, observations, drafts and event photos. Earlier backup versions remain readable. Older FieldTrace releases cannot read version 3, preventing accidental loss of the new fields.

Only application assets and invented examples belong in GitHub. Imported setup, coordinates, contracts and records remain in the browser and private downloaded files. No existing SDR/SiteBoard source was modified in this phase. Case exchange follows in Phase 3B.
