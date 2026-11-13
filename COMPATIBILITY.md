# Assets Library discovery compatibility

Automatic discovery depends on the evidence and filesystem access exposed by Orca. This document explains which generated outputs can be found, how older outputs are recovered, and where coverage is limited.

## Discovery coverage

Worktree outputs require explicit structured write/output or recorded chat file-change evidence. Agent activity timing alone never discovers a repository file. Worktree activation recovers supported outputs from recorded paths and refreshes previously indexed originals. Dedicated chat-output folders are also collected when the journal records their session as owned by the active worktree.

Unknown historical repository files cannot be classified as generated from their presence alone. They remain excluded, including during refresh. There is no ordinary repository asset scan. Tools without usable write/output or recorded file-change evidence may not produce collectible assets.

Results follow the active worktree. Inactive worktree records persist privately and become visible when that worktree is active again. Discovery never combines unrelated repositories into the visible results.

Missing displayed files retain their indexed metadata but are hidden by default. The saved **Include unavailable files** discovery setting includes them in the gallery, search and count. An unavailable preview alone does not hide an existing file; browser codec limitations retain file actions.

## Runtime

| Requirement | Support |
| --- | --- |
| Orca | Desktop 1.4.257+ and its compatible CLI |
| Node.js | No separate installation required to use the plugin |
| macOS Apple silicon | Browser image previews; exercised in desktop Orca |
| macOS Intel | Same bundled JavaScript runtime; dedicated GitHub Actions checks configured |
| Linux / Windows | No architecture-specific binaries; desktop behavior not yet verified |
| SSH / remote files | Unsupported state; no remote roots are read as machine files |
| Network | No connection required for collection or previews |

PNG, JPEG, WebP, GIF, SVG and AVIF file signatures and dimensions are checked during collection. Orca’s browser performs image decoding when a preview is viewed. AVIF rendering also depends on Orca’s browser support. GIF originals animate. Markdown (.md/.markdown) is validated UTF-8 text and rendered as a safe excerpt. HTML (.html/.htm) must contain a recognizable HTML document or fragment signature and valid UTF-8 text. It appears under Other with a source excerpt; HTML is never rendered as an executable page inside Library. MP4 and WebM containers are inspected for a video track; audio-only files are excluded. WebM VP8, VP9 and AV1 track headers are recognized. The worker validates headers; Orca’s browser decodes requested thumbnail frames and video previews using its built-in codecs. Header validation does not guarantee playback. Info uses native HTML video controls, and unsupported codecs retain a clear fallback and file actions. No decoder library, transcoder or additional package is required. Fonts and other video containers are deferred.

The worker uses Orca’s supplied runtime and a bundled JavaScript header parser. Image elements render private Blob URLs; a canvas creates bounded thumbnails for the plugin-owned cache. No native addons, separate Node process, dependency downloads or preview servers are used. Full browser decoding is deferred until the panel needs an image. Corrupt or unsupported images show an unavailable preview without changing their provenance.

## Discover outputs from previous chats

The workspace adapter reads the documented **worktree ps** inventory and matches unique local workspace paths to SDK identities. It retains native workspace/session IDs, agent activity and optional project appearance; prompts and transcript files are never read. A separate journal adapter resolves dedicated output folders for owned sessions. Inventory and native file-change metadata are checked every five seconds and on worktree activation or Refresh.

The worktree-name strip uses optional **project list** metadata: project ownership (`sourceRepoIds`) joins the inventory's `repoId`, without matching on names or changing asset identity. Configured project colors and supported Lucide icons appear beside the active worktree name. Box, Sparkles, Code2/CodeXml and icons already used by Library are supported; other Lucide names and uploaded/custom icons fall back to a color dot. Ambiguous ownership or unavailable metadata omits the badge. No external icons or additional packages are loaded.

A separate compatibility adapter reads explicit file-change paths from the local Orca journal. Its read-only SQLite query selects ownership, session IDs and paths, without retrieving prompts, messages or patch text. Canonical current-worktree paths with explicit change evidence are signature-validated and indexed. Local session ownership also identifies dedicated chat-scratch directories, using the first 32 hex characters of SHA-256(sessionId), matching the installed host. Only owned folders are scanned. Ordinary neighboring files and unrelated chat folders are never scanned.

This adapter is verified against the Orca 1.4.257 journal schema and requires a local SQLite CLI. It stops safely when the executable, database or schema is unavailable; SDK tool evidence and existing indexed files remain usable. File-change queries accept at most 5,000 entries, 2 MB and six seconds. Ownership queries accept at most 500 sessions. Each owned folder scan accepts at most 10,000 entries and 12 directory levels, excluding dependencies, temporary files and escaping symlinks. Remote journals are not read. Unknown historical worktree files without recorded evidence remain excluded.

## Confidence in generated origin

Confirmed worktree outputs and resources in dedicated folders of chats owned by the active worktree appear. Chat-folder records use a separate chat-output origin: recorded ownership confirms which chat the folder belongs to, rather than a per-file tool write. Ownership is checked before collecting new chat outputs; unrelated or ambiguous owners cannot expose new files. Previously prepared worktree copies retain their recorded provenance even if the source or session ownership record disappears. Ordinary repository files and timing-inferred records remain excluded. Original files are never modified or removed.

## Recheck and locate generated originals

The refresh icon beside the count forces a new check of recorded file-change paths and previously attributed originals in the active worktree. It also checks owned chat folders; ordinary repository files and unrelated chats remain excluded. Duplicate records consolidate by normalized canonical full path including filename, preserving metadata and provenance.

Worktree images, SVGs, Markdown and videos open through canonical worktree-relative editor paths. Worktree HTML uses the documented browser route. Discovery retains chat originals for history without copying. Open prefers an explicitly generated worktree file at the same relative path when its content matches or recorded evidence identifies the same originating session. It never guesses from the filename or branch alone. When direct opening is unavailable or fails, a size-limited, atomic working copy is prepared in .orca/assets-library/opened/ and opened with a relative editor path. Chat-folder originals cannot be sent directly to editor.open because its path must stay inside the worktree. The fallback record retains its ID and original provenance while previews, references and file actions use the copy. Info displays a working-copy notice and original path. Existing copies, including those created by earlier automatic-copy builds, are preserved without background resync. User edits and original files remain untouched. Missing copies can return to an available chat original during discovery; another copy is created only when opening requires it. Symlinked destinations and escaping paths are rejected. Failed copies are never recursively copied. Explorer opens worktree files; chat history retains absolute-path copy and Open actions. Selected-native-chat filtering and exact creation-message navigation lack supported APIs and are omitted.

## Limits and validation

The file-size limit defaults to 32 MB and is configurable from 1–64 MB for generated-output collection, including videos. Video inspection is bounded to 4,096 container elements. Preview bytes travel only on demand through the existing bounded IPC. Metadata is stored in 64 compressed shards and the persistent thumbnail cache is bounded to 1 MB / 128 entries. Older per-file indexes migrate automatically, including when Orca’s 1,024-key quota has been reached. Orca’s 256 KB per-value and 5 MB total storage limits still apply; unusually large metadata may reach that quota before the 20,000-record ceiling. The gallery pages 100 records, virtualizes rows, limits concurrent browser thumbnail tasks to two, and bounds thumbnail/DOM caches. The index accepts at most 20,000 records; ordinary repository directories and unrelated chat folders are not scanned. Images have a 40-million-pixel header limit; browser image/video previews use a 40-million-pixel bound. Image and video originals are previewed on demand up to 16 MB. Video thumbnails cache one decoded frame; cards do not maintain playing video elements. Leaving Info pauses the player, unloads its source and releases its Blob URL. Worker preview snapshots are bounded to four files / 32 MB, transferred in 128 KB chunks, and guarded against version changes. Cached thumbnails are at most 480 pixels per side. Markdown and HTML previews accept at most 2 MB and show at most 3,000 characters / 64 lines.

Engine and browser checks cover generated-only worktree refresh, canonical-path deduplication, worktree isolation, mutation, deletion, restart, owned chat-folder recovery, copy-free discovery, worktree-first opening, copy fallback, source updates, edited-copy preservation, ownership checks for new outputs, workspace/session mapping, hostile paths, safe rendering, narrow/wide layouts, light/dark appearance, keyboard focus and reduced motion. Catalog previews use sample fixtures. Desktop verification has been performed on macOS Apple silicon; configured CI coverage is not a claim that hosted jobs have already run.
