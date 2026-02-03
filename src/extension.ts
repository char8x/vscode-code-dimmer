import * as vscode from 'vscode';
import { SymbolStore } from './lib/storage.js';
import { SymbolManager } from './lib/symbols.js';
import { getLinesByRanges, getNonSelectedRanges } from './lib/ranges.js';
import { isVariableSelection, getReadOrWriteHighlights } from './lib/editor.js';
import {
  loadSettings,
  subscribeSelectionHighlightBorderChange,
} from './lib/config.js';

/**
 * Calculate Decoration Range
 *
 * @param symbolManager
 * @param editor
 * @returns
 */
async function calculateRanges(
  symbolManager: SymbolManager,
  editor: vscode.TextEditor
): Promise<{
  nonSelectedRanges: vscode.Range[];
  selectedLines: Array<[number, number]>;
}> {
  const selectionText = editor.document.getText(editor.selection);

  const symbolsMap = await symbolManager.loadSymbolMap(editor.document);
  const highlights = await getReadOrWriteHighlights(editor);

  if (symbolsMap && symbolsMap.has(selectionText)) {
    const symbols = symbolsMap.get(selectionText) ?? [];

    // case 1: The selected variable is a symbol, and the selected range precisely covers the scope of definition for that symbol
    const symbol = symbols.find((sym) =>
      sym.selectionRange.isEqual(editor.selection)
    );
    if (symbol) {
      return getNonSelectedRanges(
        editor,
        getLinesByRanges([symbol.range, ...highlights.map((i) => i.range)])
      );
    }
    // case 2: The selected variable is a certain symbol, but the selected range does not cover the symbol's definition scope, yet the highlighted range includes the symbol's definition scope
    const intersectionSymbol = symbols.find((sym) =>
      highlights.some((hl) => hl.range.isEqual(sym.selectionRange))
    );
    if (intersectionSymbol) {
      return getNonSelectedRanges(
        editor,
        getLinesByRanges([
          intersectionSymbol.range,
          ...highlights.map((i) => i.range),
        ])
      );
    }
  }

  // Fading treatment is applied only when there are at least two highlights
  if (highlights.length <= 1) {
    return { nonSelectedRanges: [], selectedLines: [] };
  }

  return getNonSelectedRanges(
    editor,
    getLinesByRanges(highlights.map((i) => i.range))
  );
}

export async function activate(context: vscode.ExtensionContext) {
  const symbolStore = new SymbolStore(context);
  const symbolManager = new SymbolManager(symbolStore);

  subscribeSelectionHighlightBorderChange(context);

  let { isEnabled, codeDecoration, isAutoUnfold } = loadSettings();

  // Re-load settings when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('codeFader.decoration') ||
        e.affectsConfiguration('codeFader.enabled') ||
        e.affectsConfiguration('codeFader.autoUnfold')
      ) {
        const settings = loadSettings();
        isEnabled = settings.isEnabled;
        codeDecoration = settings.codeDecoration;
        isAutoUnfold = settings.isAutoUnfold;
      }
    })
  );

  let selectionVersion = 0;

  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    if (!isEnabled) {
      event.textEditor.setDecorations(codeDecoration, []);
      return;
    }

    // Respond only to mouse selection events, ignoring keyboard selection
    if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
      if (event.selections.length === 1 && event.selections[0].isEmpty) {
        // When the selection area becomes empty (which usually happens when pressing Esc to cancel multiple selections or deselecting items)
        event.textEditor.setDecorations(codeDecoration, []);
      }
      return;
    }

    if (!isVariableSelection(event.textEditor)) {
      event.textEditor.setDecorations(codeDecoration, []);
      return;
    }

    const newVersion = ++selectionVersion;
    const editor = event.textEditor;
    const { nonSelectedRanges, selectedLines } = await calculateRanges(
      symbolManager,
      editor
    );

    if (newVersion !== selectionVersion) {
      return;
    }

    editor.setDecorations(codeDecoration, nonSelectedRanges);

    if (isAutoUnfold && selectedLines.length > 0) {
      for (const line of selectedLines) {
        await vscode.commands.executeCommand('editor.unfold', {
          levels: 1,
          direction: 'up',
          selectionLines: line,
        });
      }
    }
  });
}

export function deactivate() {}
