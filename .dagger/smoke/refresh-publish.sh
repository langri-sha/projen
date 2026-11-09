#!/usr/bin/env bash
set -euo pipefail

[[ -f /out/message ]] && cat /out/message

status=$(cat /out/status)
[[ $status == none ]] && exit 0

cd /repo

if [[ $status == push ]]; then
  expect=$(cat /out/expect 2> /dev/null || true)
  git -c core.hooksPath=/dev/null push --force-with-lease="$BRANCH:$expect" \
    "${REMOTE:-https://x-access-token:$GH_TOKEN@github.com/$REPOSITORY.git}" "$BRANCH"
fi

if [[ $PULL_REQUEST == true && -z $(gh pr list --repo "$REPOSITORY" --head "$BRANCH" --state open --json number --jq '.[].number') ]]; then
  gh pr create --repo "$REPOSITORY" --base "$BASE" --head "$BRANCH" --title 'Regenerate the schema types' --body "$(cat <<'BODY'
The weekly regeneration of the types the packages derive from their JSON schemas. If `smoke:api-breaks` reports a break, clear it with the command it prints, for example `pnpm exec beachball change --package <name> --dependent-change-type minor`. Commits you push to this branch are kept; until you merge or close the pull request, the workflow only fails when the schemas move again.
BODY
)"
fi
