<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- UI → `src/lib/store.ts` (app services) → `src/services/*` (persistence, OS integration). Keeps components free of OS/storage logic so a desktop build can swap implementations.
- All OS operations (pick folder, open in Explorer, run actions) go through `FileSystemService` in `src/services/filesystem`; the web impl must report `requires-desktop` instead of faking success.
- Persistence goes through `AppRepository`: primary store is `data/ambientes-data.json` written via server functions (needs writable disk), localStorage is the instant-load cache/fallback.
- Checklist item deletion is soft (`deleted` flag); only explicit purge removes the record.
- Checklists are global entities; environment association is a many-to-many join, never ownership.
