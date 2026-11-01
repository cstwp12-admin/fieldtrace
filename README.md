# FieldTrace

Spatial field observations and follow-up, part of the SiteBoard ecosystem.

**v0.6.0 — Phase 4 pilot candidate for Android and iPhone; SiteBoard v0.12.0 remains compatible.** Separate application and release cycle. Physical-phone and field validation are still required.

[Source repository](https://github.com/cstwp12-admin/fieldtrace) · [GitHub Pages application](https://cstwp12-admin.github.io/fieldtrace/) · [Deployment notes](docs/DEPLOYMENT.md)

A blank **Android & iPhone pilot worksheet** is available under Project data. It saves separate trial results, timing samples and acceptance-review notes; every physical check starts pending. [Phase 4 protocol](docs/PHASE_4.md). Local validation is complete; physical field acceptance remains outstanding.

## Run locally

Use Node.js 22 or newer and pnpm 11.25.0:

```sh
pnpm install
pnpm dev
```

Open the printed localhost URL. Choose **Explore demonstration** for invented training records, **Create a project** for a two-point corridor, or import a configuration. The demonstration is loaded only when explicitly selected.

```sh
pnpm test
pnpm build
pnpm preview
```

To produce a code-only pilot archive and checksum after building, run `python scripts/package_pilot.py`. The archive is written into ignored `releases/`; it contains static app assets and deployment notes only. No hosting change is made.

## Included

- React, TypeScript, Vite, Leaflet, Dexie / IndexedDB, Zod.
- Responsive overview, alignment map, chainage search and observation register.
- New observation with manually confirmed chainage, optional device GPS and up to eight original photographs.
- Action, monitoring, closure and reopening history with up to eight photographs per event. Original, corrective-action and verification photographs remain separate.
- Automatic local drafts for new observations and follow-up updates, including attachments. Close/reopen the form to resume; submitting commits the record and removes its draft atomically.
- Evidence preview with original condition, action chronology, verification and closure, printable using browser Save as PDF.
- CSV register and version 5 JSON backup including shared setup, previous setup snapshots, original/event photographs and unfinished drafts. Version 1, 2, 3 and 4 backups remain readable. Permanent source case IDs survive restored copies.
- Backup restore creates a separate project with new internal IDs. It never replaces the original.
- Project import/export and two-control-point project creation.
- Local geometry map without remote basemap requests, analytics, external fonts or upload endpoints.
- Generated offline application shell, installation manifest, waiting-update control and device-storage persistence request.
- Local SDR `setup.json` import with a review/confirmation step, shared project identity and deterministic setup/alignment revisions.
- Preserved source structure/activity IDs, zones, team sections and source references on new observations.
- Explicit updates retain existing cases/drafts and archive the previous configuration. Unsafe range reductions and removal of referenced IDs are blocked.
- Coordinate-free SDR setups work in chainage-only mode; no geography is fabricated. Drawing structures appear on mapped alignments as indicative locations.

## Send cases to SiteBoard

Import the same SDR setup into both apps. In FieldTrace open **Reports → Export cases to SiteBoard**, select submitted cases and download the private package. In SiteBoard open **FieldTrace cases**, import, review project/conflicts, then confirm. Use the register, map, CSV and PDF/Word evidence reports. Re-export after recording follow-up in FieldTrace. [Phase 3B guide](docs/PHASE_3B.md) explains updates, recovery and limits.

## Link SDR evidence

In SiteBoard, refresh the source PDFs and export SDR references from a report item, legacy Observations row, or the FieldTrace cases view for the selected period. In FieldTrace, open the relevant case → Import SDR references → review/select items → enter your name and review note → confirm. Export the updated case back to SiteBoard to see source matching and legacy cross-links. See [Phase 3C guide](docs/PHASE_3C.md). Create a case normally first when no suitable case exists; importing references never creates cases automatically.

## Public code / private data

Keep actual alignment, project configuration, names, photos, reports and backups **outside this source folder**. The app reads files on the user's device. Browser storage is not a backup and does not provide authentication or encryption.

Publish only generated `dist/` through GitHub Pages. `.gitignore` is a convenience, not a guarantee; already tracked files are unaffected. The release check restricts output file types and detects several known project terms, but cannot detect arbitrary confidential content. Review tracked files and the generated release before pushing. Use synthetic test data only.

The workflow assumes **this folder is the repository root**. On the separate repository, select GitHub Actions as the Pages source. The build uses relative asset paths for a repository subpath. The workflow validates and publishes `dist/`; it must never publish a project-data directory. No real project defaults are compiled into the app.

## Current boundaries

- Single-device local workflow; recorded names are not authenticated signatures. Assignments do not send notifications.
- SDR project setup and manual SiteBoard case exchange are implemented. SDR references can be added from a case; source photographs remain in the original PDF. Backup is separate from a case integration package.
- Alignment points use WGS84 latitude/longitude and increasing chainage in metres. Projection uses an approximate local plane for field context, not survey acceptance or setting out.
- Chainage-only markers lie on the centreline; LHS/RHS is a recorded attribute, not a surveyed offset.
- For offline use, run the production build with `pnpm build` then `pnpm preview`. Open online first and wait for **Application available offline**. Development mode deliberately does not install a worker. Installation availability varies by browser; use the browser install menu or Add to Home Screen where available.
- The service worker caches only generated application assets. Project records remain in IndexedDB, separate from the shell. Updates wait for **Update & reload**; close forms first. Offline basemaps are not included.
- No continuous background GPS recording, cached basemaps, formal inspection templates or enforceable consultant/contractor permissions yet.
- Photo size and backup limits protect the pilot; very large datasets need storage and memory testing.
- Photographs are original local attachments; this release does not annotate or resize them. A roughly 30 MB synthetic recovery trial is tested on desktop/in-memory IndexedDB; larger datasets and real phone storage remain unverified.
- Two tabs cannot silently overwrite the same case revision: a stale update is rejected and its draft retained. Review current history before retrying; discard an obsolete draft explicitly after copying any notes you need.
- Drafts are private local data and are included in complete project backups. One new-observation draft per project and one follow-up draft per case are supported.

See [implementation plan](docs/IMPLEMENTATION_PLAN.md) and [data contract](docs/DATA_CONTRACT.md).

See [pilot guide](docs/PILOT_GUIDE.md) for a complete trial routine and remaining device checks.

See [Phase 3A guide](docs/PHASE_3A.md) for shared setup import, identity rules, safe updates and compatibility limits.
