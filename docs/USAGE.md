# Discover generated assets with Assets Library

Assets Library finds supported outputs in the active worktree and its associated chat folders. Ordinary repository files and unrelated chat folders remain excluded.

## Start automatic discovery

1. Enable Assets Library and open an Orca worktree.
2. Let an agent generate or modify a supported image, video, SVG, Markdown or HTML file inside the worktree through a tool that exposes write/output or structured file-change evidence, or in that chat’s dedicated output folder.
3. Open the book icon in the right sidebar to find outputs that the worker identified. No registration prompt or manual scan is required where sufficient evidence is available.
4. Return to a worktree later to recover indexed outputs and files identified by recorded chat file-change paths.

Automatic discovery continues with the panel closed. A new result appears without changing focus or opening the sidebar. Writes stabilize for about 550 ms; native file-change metadata is checked at the five-second inventory interval. See [compatibility](../COMPATIBILITY.md).

## What is discovered automatically

Library combines explicit tool-confirmed worktree outputs with recorded chat file-change paths. Activity timing alone does not add repository files. Worktree files and dedicated output folders owned by that worktree’s chats appear. Switching worktrees replaces the visible collection and exits any previous-worktree detail view. Old Project and All Discovered preferences migrate to current-worktree generated-only results.

The rounded worktree strip shows the project's configured icon and color when Orca's CLI exposes them. Unsupported icon types use a color dot; missing metadata leaves the worktree name alone. The badge follows worktree switches and project appearance changes.

When a worktree opens or activates, Library checks recorded worktree file-change metadata and refreshes known records. It updates previews after changes and marks removed worktree files unavailable. Background checks inspect owned chat folders but never inventory ordinary repository files or unrelated chats, or force the sidebar open. Previously indexed samples affected by the Library folder rename recover their paths only when the replacement original has the same content hash.

## Recheck generated outputs

Use the refresh icon immediately to the right of the asset count. It rechecks recorded file-change paths and already attributed files in the active worktree, with progressive results and a temporary busy state. Ordinary repository files remain excluded, including recently modified files without structured evidence. The collection has no generated/all-assets switch.

Excluded folders, extensions and file-size limits are in the three-dot discovery settings menu. Generated outputs may be Git-ignored. Exclusions and safe-path checks still apply.

Unavailable files are hidden by default, including from search and the asset count. Enable **Include unavailable files** in discovery settings to show missing displayed files from the saved generated-asset index. The setting persists across restarts and never includes ordinary repository files or unrelated chat outputs. Disabling it hides missing records without deleting their metadata.

## Locate a discovered output

Cards and List show the same discovery results. Search is always visible beside the view controls. The matching asset count sits to the right of the type filters. At narrow widths, the filters scroll horizontally while the count stays visible. Cmd/Ctrl+F focuses search; Escape clears its query. List retains type/size beside its right-aligned Open/Info buttons. New cards enter once with a 180 ms fade and 96–100% scale; regular updates do not replay the full gallery animation.

The gallery fades into the panel background when more content is below. Its scrollbar appears on hover or keyboard focus without shifting cards, and the fade disappears at the bottom or when all results fit.

Open navigates displayed images, SVGs, Markdown and videos to Orca’s editor. Fallback copies open in the editor; original worktree HTML opens in Orca’s browser. Info opens the sidebar inspector. Fit, zoom, pan and checkerboard controls apply to images. The All Assets header stays visible while details scroll. Markdown has a bounded rendered excerpt, a bottom fade and a hover/focus scrollbar. HTML (.html/.htm) appears under Other with a bounded source excerpt; scripts and linked resources never execute inside Info. Videos collects MP4 and WebM files with video tracks, frame thumbnails, metadata and file actions. Info shows native HTML video playback controls without extra decoder packages. Unsupported codecs or files above the 16 MB preview limit retain file actions and a fallback.

Every editor request uses a path relative to and inside the canonical worktree. Discovery indexes generated worktree files and session-owned chat originals without copying. For a chat history entry, Open prefers an explicitly attributed worktree file with the same relative path and either matching content or the same originating session. Ordinary files are never selected by filename alone. If no supported original route exists or opening is rejected, Library copies the file under .orca/assets-library/opened/<session-or-worktree>/<original relative path> and opens that copy in the editor. The entry keeps its identity and then previews/references the copy. Info clearly identifies working copies and their original paths. Successful original opens do not copy. Existing copies and edits are preserved across refresh and restart; background discovery never resyncs them. If a copy disappears while its chat source remains available, discovery restores the original history entry without writing a replacement. The source is never modified. Unavailable files retain metadata and cannot be opened.

## Discovery evidence and privacy

MP4/WebM container and video-track headers are validated without decoding encoded frames. Audio-only files are excluded. The default 32 MB file-size limit applies to videos and can be changed to 1–64 MB in discovery settings.

Image previews use Orca’s browser image elements. Thumbnails are created when viewed and cached; background collection does not require the panel or a separate Node.js installation.

Private plugin storage contains the index, hashes, preferences and bounded thumbnails. Nothing is uploaded, no cloud processor is used and no transcripts are indexed. The CLI inventory can include conversation snippets; the adapter retains only workspace/session ownership and activity. No prompt text is persisted.

Readers canonicalize approved roots and file paths, reject escaping symlinks, wait for stable writes, validate signatures and limit size. SVG uses an element/attribute allowlist. Markdown uses safe DOM nodes; raw HTML is omitted and image/link resources never load. Discovery and Info never execute content. Open explicitly renders original HTML in Orca’s browser.

Each canonical full file path, including filename, has one record. Repeated events and refreshes deduplicate; duplicate records retain the strongest provenance, and content changes increment a version counter. Removal leaves a missing-file state, and workspace switching or worker restart retains the private index.
