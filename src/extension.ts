import * as vscode from 'vscode';
import { SymbolStore } from './lib/storage.js';
import { SymbolManager } from './lib/symbols.js';
import {
  loadSettings,
  subscribeSelectionHighlightBorderChange,
} from './lib/config.js';
import { SelectionHandler } from './lib/selectionHandler.js';

export async function activate(context: vscode.ExtensionContext) {
  const symbolStore = new SymbolStore(context);
  const symbolManager = new SymbolManager(symbolStore);

  subscribeSelectionHighlightBorderChange(context);

  let { isEnabled, codeDecoration, isAutoUnfold } = loadSettings();

  // Re-load settings when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('codeDimmer.decoration') ||
        e.affectsConfiguration('codeDimmer.enabled') ||
        e.affectsConfiguration('codeDimmer.autoUnfold')
      ) {
        // Clear old decorations before disposal
        if (vscode.window.activeTextEditor) {
          vscode.window.activeTextEditor.setDecorations(codeDecoration, []);
        }
        codeDecoration.dispose();

        const settings = loadSettings();
        isEnabled = settings.isEnabled;
        codeDecoration = settings.codeDecoration;
        isAutoUnfold = settings.isAutoUnfold;
      }
    })
  );

  const selectionHandler = new SelectionHandler(symbolManager, () => ({
    isEnabled: isEnabled ?? true,
    codeDecoration,
    isAutoUnfold: isAutoUnfold ?? true,
  }));

  const disposable = vscode.window.onDidChangeTextEditorSelection((event) =>
    selectionHandler.handleSelectionChange(event)
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
