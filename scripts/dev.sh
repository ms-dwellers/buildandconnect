#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$script_dir/.."

if ! command -v node >/dev/null 2>&1; then
	echo "Install Node.js 26.13 or newer within version 26. See docs/development.md." >&2
	exit 1
fi

task=${1:-dev}
if [[ $# -gt 0 ]]; then
	shift
fi

case "$task" in
help | --help | -h) exec node scripts/check-development.mjs "$task" ;;
esac

if ! command -v bun >/dev/null 2>&1; then
	echo "Bun was not found. Install the version in package.json. See docs/development.md." >&2
	exit 1
fi

node scripts/check-development.mjs "$task" "$(bun --version)"
if [[ "$task" == setup ]]; then
	exec bun install --frozen-lockfile "$@"
fi
exec bun run "$task" "$@"
