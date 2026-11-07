#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$script_dir/.."

if ! command -v node >/dev/null 2>&1; then
	echo "Install Node.js 26.13 or newer within version 26, including npm. See docs/development.md." >&2
	exit 1
fi

task=${1:-dev}
if [[ $# -gt 0 ]]; then
	shift
fi

node scripts/check-development.mjs "$task"
case "$task" in
help | --help | -h) exit 0 ;;
esac

if ! command -v npm >/dev/null 2>&1; then
	echo "npm was not found. Install npm alongside Node.js." >&2
	exit 1
fi

if [[ "$task" == setup ]]; then
	exec npm ci "$@"
fi
exec npm run "$task" -- "$@"
