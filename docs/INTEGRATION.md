# Assets Library discovery integration matrix

Automatic discovery combines structured agent/tool write evidence, explicit worktree file-change metadata from the optional local journal adapter updates to attributed worktree files and dedicated output folders of recorded local sessions owned by the active worktree. Ordinary repository files never enter the results, and there is no general repository asset scan.

The plugin uses installed SDK typings as its baseline and keeps compatibility dependencies behind adapters. It imports no Orca core modules and does not modify tools, terminal traffic or agent prompts.

| Requirement | Integration | Limit |
| --- | --- | --- |
| Right sidebar | contributes.panels, HTML sandboxed frame, book icon | One Assets Library panel |
| Automatic discovery worker | activate/deactivate, manifest hooks and events; debounced filesystem watchers | Identifies supported new/changed outputs while the enabled sidebar is closed |
| Discovery on worktree activation | Workspace events, persisted records and recorded chat file-change paths | Recovers identifiable outputs; unknown historical repository files are excluded |
| Workspace context | workspace.readContext and workspace.list | Exact IDs where supplied, otherwise unambiguous name/branch or observed ownership |
| Project icon and color | Documented project list and worktree ps CLI metadata; sourceRepoIds → repoId | Optional; supported Lucide icons, color-dot fallback for other icons; no name-based joins or asset identity changes |
| Scope of discovery results | Active SDK workspace ID; canonical project identity retained privately | No project aggregation control; gallery and discovery follow the active worktree |
| Agent activity | agent.status.changed, agents.list | Lifecycle and workspace mapping; timing alone never discovers repo assets |
| Historical worktree files | Read-only local journal compatibility adapter, explicit diff paths | Current local workspace only; version-dependent schema and SQLite CLI; no conversation text |
| Tool evidence | agent.tool.before/after with workspace/tool/input and optional output/call ID | Only recognized writes/explicit output paths confirm; failed/read/opaque shell calls do not |
| Native sessions | CLI inventory plus read-only journal session ownership | Dedicated chat-scratch folders through a version-dependent adapter; no prompts or transcript files |
| Selected chat / creation message | No supported selected-native-tab or message-anchor navigation API | No invented Chat scope or jump link |
| Preview delivery | Typed plugin.request; bounded chunks → private Blob URLs → image elements | Browser decoding and cached thumbnails; no native addon, preview server or external Node.js |
| Video discovery | Bounded MP4/WebM container and video-track inspection in the worker | Browser-decoded thumbnail frames and native HTML video controls; bounded Blob IPC; no added decoder package |
| Native navigation | editor.open, workspace.open, CLI browser route | Original worktree files first; browser for worktree HTML; relative editor paths for fallback copies when direct opening fails |
| Chat output copies | Trusted worker, session-owned source roots and atomic worktree writes | No copying during discovery; copy into .orca/assets-library/opened/ only when Open requires a fallback; preserve edited copies and originals; reject symlink destinations |
| On-demand refresh | library.refresh rechecks recorded file-change paths and attributed files in the active worktree | No ordinary repo scan; overlapping requests share the active refresh |
| Asset identity | Canonical full path including filename; persisted duplicate consolidation | Separate paths remain separate even with identical contents |
| Private persistence | Plugin-owned storage | No repository metadata writes; bounded thumbnail storage; chat working copies live in the owning worktree |
| Remote workspaces | Host identity check | Unsupported remote-filesystem state; no machine-path assumptions |

The workspace adapter matches unique local SDK and CLI workspace paths, retains native aliases and activity, and never reads chat folders. Remote, duplicate-path and missing-address rows cannot authorize local files. CLI failures revoke stale metadata; SDK collection remains independent. See [compatibility](../COMPATIBILITY.md).

Structured hooks do not universally include generated paths, conversation IDs or message anchors. Only explicit tool evidence and recorded file-change paths add worktree outputs. Ordinary repository files and unrelated chat-folder assets never appear, including under legacy query modes. Session ownership authorizes dedicated output directories belonging to the active worktree; chat association is stored separately from per-file tool evidence. Canonical paths and escaping-symlink checks are enforced before indexing or navigation.
