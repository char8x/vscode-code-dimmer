import * as vscode from 'vscode';
import { SymbolManager } from './symbols.js';
import { isVariableSelection } from './editor.js';
import { calculateRanges } from './logic.js';

export interface SelectionHandlerSettings {
  isEnabled: boolean;
  codeDecoration: vscode.TextEditorDecorationType;
  isAutoUnfold: boolean;
}

/**
 * Handles selection change events in the text editor.
 * Extracted from extension.ts to facilitate unit testing.
 */
export class SelectionHandler {
  private selectionVersion = 0;

  constructor(
    private symbolManager: SymbolManager,
    private settingsProvider: () => SelectionHandlerSettings
  ) {}

  private getSettings(): SelectionHandlerSettings {
    return this.settingsProvider();
  }

  /**
   * Main handler for the onDidChangeTextEditorSelection event.
   */
  public async handleSelectionChange(
    event: vscode.TextEditorSelectionChangeEvent
  ) {
    const { isEnabled, codeDecoration, isAutoUnfold } = this.getSettings();

    if (!isEnabled) {
      event.textEditor.setDecorations(codeDecoration, []);
      return;
    }

    // Respond only to mouse selection events, ignoring keyboard selection
    if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
      if (event.selections.length === 1 && event.selections[0].isEmpty) {
        // When the selection area becomes empty (e.g., pressing Esc or deselecting)
        event.textEditor.setDecorations(codeDecoration, []);
      }
      return;
    }

    if (!isVariableSelection(event.textEditor)) {
      event.textEditor.setDecorations(codeDecoration, []);
      return;
    }

    const newVersion = ++this.selectionVersion;
    const editor = event.textEditor;
    const { nonSelectedRanges, selectedLines } = await calculateRanges(
      this.symbolManager,
      editor
    );

    if (newVersion !== this.selectionVersion) {
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
  }

  /**
   * For testing purposes: get the current selection version.
   */
  public getSelectionVersion(): number {
    return this.selectionVersion;
  }
}
