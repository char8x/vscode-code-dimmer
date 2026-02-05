px := "pnpm exec"
extension_name := `jq '.name' package.json`

list-all-testcase:
  {{px}} vitest list | fzf

test-unit-all:
  {{px}} vitest --config vitest.config.mts --bail 1 --run

test-unit file='' name='' timeout='0':
  {{px}} vitest run {{file}} -t "{{name}}" --testTimeout={{timeout}} --hideSkippedTests

prepare version:
  git checkout -b "release/v{{version}}"
  echo "Updating package.json to {{version}}..."
  jq ".version = \"{{version}}\"" package.json > package.json.tmp && mv package.json.tmp package.json
  git add package.json
  git commit -m "chore: bump version to {{version}}"
  git push origin "release/v{{version}}"

release version:
  git checkout main
  git pull origin main
  git tag -a "v{{version}}" -m "Release v{{version}}"
  git push origin "v{{version}}"
  vsce package -o {{extension_name}}-v{{version}}.vsix
  gh release create v{{version}} ./{{extension_name}}-v{{version}}.vsix --generate-notes --notes-file CHANGELOG.md
  vsce publish {{version}}

