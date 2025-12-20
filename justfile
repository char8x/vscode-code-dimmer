
extension_name := "vscode-code-dimmer"

gh_release tag:
  vsce package -o {{extension_name}}-{{tag}}.vsix
  gh release create {{tag}} ./{{extension_name}}-{{tag}}.vsix --generate-notes
