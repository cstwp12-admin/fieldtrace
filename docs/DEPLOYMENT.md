# GitHub Pages deployment

Repository: https://github.com/cstwp12-admin/fieldtrace

Application address: https://cstwp12-admin.github.io/fieldtrace/

## What is published

The repository contains the application source, synthetic examples, tests and documentation. The Pages workflow tests/builds it and uploads only generated dist assets. Actual project setup, reports, photographs, case/reference packages, recovery backups, pilot results, QA output and dependency folders are not repository content.

This source folder is the repository root. Do not initialize or publish the parent multi-application workspace. Keep private inputs outside the repository; ignored-file patterns are an extra guard and do not protect files already tracked in Git.

## Publishing and updates

Settings → Pages uses GitHub Actions. A push to main, or a manual workflow run on main, runs .github/workflows/pages.yml. Pull requests run validation without deployment. The jobs install the pinned package manager/dependencies, run tests, build the release, check its public-asset boundary and deploy the dist artifact. Deployment uses the normal GitHub Pages workflow permissions; no application data service or project-data secrets are required.

The isolated repository intentionally skips nine compatibility checks that need the separate SiteBoard source. Its remaining 51 tests run without that sibling checkout. In the combined development workspace all 60 checks run. Synthetic test output creates its own ignored .qa folder on a fresh checkout.

After a successful run, verify the application and pilot.html at the published address. Keep the same address for subsequent releases. Existing clients may offer Update & reload: back up, save/close forms, then apply the update. Reverting a code release does not revert or delete browser project records; check data-format compatibility before rolling back to an older application version.

## Begin the phone pilot

Open the hosted address online on Android and iPhone. Localhost preview storage does not automatically transfer to the hosted origin: import the approved setup and, where needed, a privately transferred recovery backup. Wait for Application available offline before disconnected trials. Open Project data → Android & iPhone pilot worksheet and follow PHASE_4.md.

Only application code is public. Project records remain in the browser and private downloaded files. Hosting is not authentication, encrypted project storage or live synchronization, and publishing the candidate does not complete physical-device acceptance.
