# FieldTrace v0.6 — observation pilot guide

Use invented data first. This is a local application; assignments do not notify other people and names are not authenticated signatures. Do not rely on it as the only copy of a project record.

SDR evidence linking is available through SiteBoard v0.12. Follow [Phase 3C](PHASE_3C.md) after the basic case trial. Retain original SDR PDFs alongside case evidence reports; references do not copy source photographs.

For Android and iPhone, use the complete [Phase 4 protocol](PHASE_4.md) and the pilot worksheet under Project data. Save/download worksheet results separately; they are not part of case backups.

## Trial routine

1. Start the production preview after building. Open online and wait for **Application available offline**. Install through the browser if offered. Keep the same site address/browser for the project.
2. Load the synthetic demonstration or import a private project configuration from outside the source folder.
3. Start **New observation**. Enter a title, chainage and original-condition photograph. Close with **Save draft & close**. Reload and reopen **New observation**; confirm the fields and photograph recover.
4. Submit the observation. Record an **Action taken** event with a response note, recorded name and rectification photograph. The original photograph must remain unchanged.
5. Add a **Closed** event with the engineer's verification note and verification photograph. Review the separate event photographs in history.
6. Open **Preview evidence & closure report**. Confirm the reference, location, original condition, response, verification, authors and times. Choose **Print / Save as PDF**. Review page breaks before issuing.
7. Download the complete backup. Restore it using **Project data → Restore as a separate copy**. Confirm all records, event photos and drafts are present and that the original project is still available.
8. On the target phone, reopen after turning off network access. Create a draft and attach a camera photograph. Reconnect, then back up the project.

## Daily use

Use SDR for daily photographic reporting. Use FieldTrace for an observation with action/verification history. Shared SDR setup import is available in Phase 3A; see PHASE_3A.md. SDR evidence linking and reviewed SiteBoard case import are implemented; see PHASE_3C.md. Backup files are recovery files, not SiteBoard case exchange packages.

FieldTrace saves incomplete forms locally. **Submit observation** and **Save update & evidence** add to the actual case history. A saved draft does not count as a reported observation. Discard controls ask again before deleting an unfinished draft; existing submitted evidence is retained.

## Update and recovery

Back up after field work. Wait until any photo loading completes, save and close forms, then use **Update & reload** when offered. The update replaces application assets and preserves the database. Request persistent storage under Project data if the browser supports it. Persistence does not replace a downloaded backup.

Move backups and reports to the private project folder. Never add them to GitHub or the application source. Only the generated static `dist/` output is deployable.

## Checks before real field reliance

- Physical Android and iPhone camera, image formats and permission behavior. HEIC is not currently supported; use JPEG/PNG/WebP.
- GPS under site conditions; chainage and side confirmation against the approved alignment. Phone location is field context, not survey acceptance.
- Locked/suspended phone, interrupted draft entry, storage-pressure behavior and offline reopening after browser restart.
- Report pagination with portrait/landscape and high-resolution photographs.
- Actual observation/closure formats and authorized review process agreed by the project team.
- Response delivery between consultant and contractor uses controlled private files, with no automatic notifications or shared online case editing.

Record capture time, reporting time, repeated entry, photo retrieval and restore success. Resolve any loss of evidence or unclear workflow before expanding the pilot.
