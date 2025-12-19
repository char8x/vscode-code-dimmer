<div align="center"><sub>
English | <a href="https://github.com/char8x/vscode-code-dimmer/blob/main/README_zh.md" target="_blank">简体中文</a>
</sub></div>

# Code Dimmer

This extension is a tool that focuses user attention by reducing the opacity of irrelevant code while reading through it.

## Getting Started

Double-click the variable name to see the effect.

![demo](./media/screenshot.gif)

## Features

### Highlight Variable Declaration

Double-clicking a variable name highlights the code block where the variable is declared.

![Variable declaration code block is highlighted](./media/highlight-variable-declaration.gif)

### Highlight Variable Reference

Double-clicking a variable name will highlight all its usages.

![Variable usage lines are highlighted](./media/highlight-variable-reference.gif)

## Troubleshooting

### Selection Highlight Border Visual Disturbance

Sometimes, the ColorTheme includes styling for `editor.selectionHighlightBorder`. Due to the limitations of the APIs within VS Code Extension, this specific item cannot be overridden, it can only be addressed by customizing configuration settings.

![Selection Highlight Border Striking](./media/selection-highlight-border-striking.png)

You can resolve this by adding the following code to `.vscode/settings.json`:

```json
"workbench.colorCustomizations": {
  "editor.selectionHighlightBorder": "default"
}
```

## Limitations

Achieving finer-grained highlighting depends on improvements in the capabilities of the Language Server, specifically its ability to track variable ranges down to the column level.

## Credits

- [LaurieWired](https://x.com/lauriewired/status/1980401405761581422) Inspired by her tweet

## License

MIT
