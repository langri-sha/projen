#!/usr/bin/env bash
set -euo pipefail
export GIT_LITERAL_PATHSPECS=1

mkdir -p /out
git clone --quiet --branch "$BASE" "${REMOTE:-https://github.com/$REPOSITORY.git}" /repo
cd /repo
git config core.hooksPath /dev/null
[[ -z ${SHA:-} ]] || git checkout --quiet "$SHA"

bot="${APP_SLUG}[bot]"
id=${BOT_ID:-$(curl -fsS "https://api.github.com/users/$APP_SLUG%5Bbot%5D" | jq -er .id || true)}
if [[ -z $id ]]; then
  echo "::warning::The id of $bot could not be looked up, so its commits use an email without it." >> /out/message
  email="$bot@users.noreply.github.com"
else
  email="$id+$bot@users.noreply.github.com"
fi
git config user.name "$bot"
git config user.email "$email"

mapfile -t generated < <(jq -r '.tasks.schemas.steps[] | select(.exec | startswith("pnpm exec schemastore-to-typescript ")) | .cwd + "/" + (.exec | split(" ") | last)' .projen/tasks.json)

if [[ ${#generated[@]} -eq 0 ]] || ! git ls-files --error-unmatch -- "${generated[@]}" > /dev/null; then
  echo '::error::The schemas task lists a file that is not tracked.' >&2
  exit 1
fi

for file in "${generated[@]}"; do
  cp "/generated/$file" "$file"
done

if [[ -z $(git status --porcelain -- "${generated[@]}") ]]; then
  echo none > /out/status

  if git rev-parse --verify --quiet "origin/$BRANCH" > /dev/null; then
    echo "::warning::The schemas match $BASE again, but origin/$BRANCH still exists. Close its pull request if it is open." >> /out/message
  fi

  exit 0
fi

git checkout --quiet -B "$BRANCH"
git add -- "${generated[@]}"
git commit --quiet -m 'Regenerate the schema types'

if git rev-parse --verify --quiet "origin/$BRANCH" > /dev/null; then
  if git diff --quiet "origin/$BRANCH" HEAD -- "${generated[@]}"; then
    echo skip > /out/status
    echo "origin/$BRANCH already has these types." >> /out/message
    exit 0
  fi

  others=$(git log "origin/$BASE..origin/$BRANCH" --format='%h%x09%an' |
    awk -F '\t' -v bot="$bot" '$2 != bot { print $1 }' |
    paste -sd ' ')

  if [[ -n $others ]]; then
    echo "::error::origin/$BRANCH has commits that are not the bot's ($others). Merge or close its pull request first." >&2
    exit 1
  fi

  git rev-parse "origin/$BRANCH" > /out/expect
fi

mkdir -p change
git diff --name-only HEAD~1 HEAD | cut -d/ -f1,2 | sort -u | while read -r directory; do
  name=$(jq -r .name "$directory/package.json")
  jq -n --arg name "$name" --arg email "$email" \
    '{type: "patch", comment: "Regenerate the types from their schemas", packageName: $name, email: $email, dependentChangeType: "patch"}' \
    > "change/$(tr '/@' '--' <<< "$name")-$(cat /proc/sys/kernel/random/uuid).json"
done

git add -- change
git commit --quiet -m 'Add change files for the regenerated types'
echo push > /out/status
