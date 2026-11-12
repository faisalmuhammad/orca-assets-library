#!/usr/bin/env bash
set -euo pipefail

# Official Orca 1.4.257 archives and their GitHub SHA-256 digests.
# Keep the version, filenames and digests together when updating the CLI.
case "$(uname -m)" in
  arm64)
    orca_asset=Orca-1.4.257-arm64-mac.zip
    orca_sha=3bc373178d8a4eeb834d76eea36551903aad3d95798c841044b8a55faf40e684
    ;;
  x86_64)
    orca_asset=Orca-1.4.257-mac.zip
    orca_sha=c79f642d6db4011dfb3750111fabb76c9d457d631de9083d9bed124942b9d373
    ;;
  *)
    echo 'The pinned Orca CLI installer requires a macOS arm64 or x86_64 runner.' >&2
    exit 1
    ;;
esac

orca_dir="${RUNNER_TEMP:?}/assets-library-orca-cli"
mkdir -p "$orca_dir"
orca_archive="$orca_dir/$orca_asset"
curl --fail --location --retry 3 \
  --output "$orca_archive" \
  "https://github.com/stablyai/orca/releases/download/v1.4.257/$orca_asset"
printf '%s  %s\n' "$orca_sha" "$orca_archive" | shasum -a 256 --check
ditto -x -k "$orca_archive" "$orca_dir"
orca_bin="$orca_dir/Orca.app/Contents/Resources/bin"
test -x "$orca_bin/orca"
printf '%s\n' "$orca_bin" >> "${GITHUB_PATH:?}"
