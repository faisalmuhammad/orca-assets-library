# Releasing Assets Library

Assets Library is an automatic discovery plugin for agent-generated images, videos, SVGs and Markdown. Release descriptions, documentation and artwork should lead with finding generated outputs; previews and file actions support that purpose.

Release version: **1.0.1**, tag **v1.0.1**.
Plugin ID: **assets-library**.

## Repository contents

The repository root is installable: commit orca-plugin.json, runtime/, publication assets, source, checks, tests, tooling, lockfile, documentation, licenses and .github/. Orca installs the compiled plugin from the tag. Publisher is derived from the GitHub owner; the manifest has no fixed publisher.

runtime/ contains only the bundled worker and panel. Native image libraries and runtime/node_modules must never be shipped. The separate development node_modules, dist/, .orca/, test captures, reports, caches, environment files and personal diagnostics are excluded.

## Prepare and verify

Set a stable major.minor.patch version in the manifest and add a matching **## <version>** changelog entry. Then run:

    npm run release:prepare
    npm ci
    orca plugin types . --json
    npx playwright install chromium
    PLAYWRIGHT_CHANNEL=chromium npm run check
    npm run release:export

The version preparation synchronizes package.json, lockfile and install references. It never increments versions or creates release notes. Sharp is development-only tooling for test fixtures and release artwork; it is never part of the installed plugin.

**release:export** produces **dist/github-upload/**, a versioned upload ZIP, its SHA-256 sidecar and an inventory. The export contains repository files and workflow tooling; **dist/plugin/** is the smaller installable artifact. Both undergo content and image audits. Building and exporting publish nothing.

## Images

**npm run release:art** renders the compiled gallery, list and Markdown inspector with controlled sample assets, then generates the icon, cover, four listing previews and GitHub social image. Fonts are system/browser fonts, with none redistributed. See [assets/SCREENSHOTS.md](assets/SCREENSHOTS.md).

The cover and GitHub social image feature the current compiled panel inside the orange/purple frame. Use **npm run release:art -- --cover-only** or **npm run release:art -- --social-only** to update either image from a fresh panel capture.

Review artwork in both themes before committing it. Set **assets/social.png** in the repository’s Social preview setting. Personal worktree names, paths and conversation content must not appear in published images.

## Automatic releases

The workflow validates pull requests, main pushes, tag pushes and manual runs on Apple silicon and Intel Mac runners. It installs an exact Orca CLI archive verified by SHA-256, generates current SDK types, runs engine/browser/release checks, validates the plugin and requires committed runtime bundles to match source.

After successful checks on a main push, the publication job reads the manifest, creates **v<version>** on the exact checked commit, and publishes its changelog notes. Tag pushes can finish publication if the matching commit is in main. No archives are attached: Orca installs the tagged repository.

Only publication has contents:write, through GitHub’s built-in token. Pull requests and manual runs validate only. Publication is serialized, existing releases are left unchanged, existing tags are never moved, and authentication/network failures stop publication. A retry can finish an already-created matching tag.

Enable Actions and add the **orca-plugin** topic when creating the repository. Protected tag rules must allow the release token to create version tags. Commit the prepared source, metadata, runtime and artwork before pushing or merging to main. Pushing main will publish automatically when its version has no release, so do this only when the version is ready.

The versioned install URL is:

    https://github.com/faisalmuhammad/orca-assets-library#v1.0.1

Repository creation, pushing, publication and catalog submission are separate from preparation. After publication, generate a catalog entry from the published commit with **orca plugin release-entry . --json**. Published tags must remain unchanged.
