px := "pnpm exec"
extension_name := "vscode-code-dimmer"

gh_release tag:
  vsce package -o {{extension_name}}-{{tag}}.vsix
  gh release create {{tag}} ./{{extension_name}}-{{tag}}.vsix --generate-notes

list-all-testcase:
  {{px}} vitest list | fzf

test-unit-all:
  {{px}} vitest --config vitest.config.mts --bail 1 --run

test-unit file='' name='' timeout='0':
  {{px}} vitest run {{file}} -t "{{name}}" --testTimeout={{timeout}} --hideSkippedTests
