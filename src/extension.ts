import * as vscode from 'vscode';
import { SymbolStore } from './lib/storage.js';
import { SymbolManager } from './lib/symbols.js';
import { getLinesByRanges, getNonSelectedRanges } from './lib/ranges.js';
import { isVariableSelection, getReadOrWriteHighlights } from './lib/editor.js';
import {
  loadSettings,
  subscribeSelectionHighlightBorderChange,
} from './lib/config.js';
import { calculateRanges } from './lib/logic.js';

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
