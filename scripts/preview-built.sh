#!/usr/bin/env bash
set -euo pipefail

package_root=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
runtime_root=$(mktemp -d "${TMPDIR:-/tmp}/buildandconnect-preview.XXXXXXXX")
trap 'rm -rf -- "$runtime_root"' EXIT

cp "$package_root"/{package.json,vite.config.ts,cloudflare.config.ts,next.config.ts,tsconfig.json} "$runtime_root/"
mkdir "$runtime_root/.cloudflare"
cp -R --no-preserve=mode "$package_root/.cloudflare/output" "$runtime_root/.cloudflare/output"
mkdir "$runtime_root/node_modules"
for dependency in "$package_root"/node_modules/*; do
	ln -s "$dependency" "$runtime_root/node_modules/"
done
cd "$runtime_root"

node "$package_root/node_modules/vite/bin/vite.js" preview --configLoader native "$@"
