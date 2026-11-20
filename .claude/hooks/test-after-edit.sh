#!/usr/bin/env bash
# PostToolUse hook: after the agent edits a TypeScript file in src/ or tests/,
# run the Vitest suite. Exit 2 feeds the failure back to the agent.
set -u
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$file" in
  */src/*.ts|*/tests/*.ts) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
if out=$(npx vitest run --reporter=dot 2>&1); then
  exit 0
fi
{
  echo "Vitest is red after editing ${file#"$PWD"/}. Fix the failure before moving on:"
  echo "$out" | grep -E "FAIL|AssertionError|Expected|Received|×|Tests " | head -40
} >&2
exit 2
