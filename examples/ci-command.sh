#!/usr/bin/env sh
set -eu
node src/cli.js "${1:?informe uma URL}" --pages 5 --max-links 40 --fail-under 80 --fail-on fail --json reports/audit.json --html reports/audit.html
