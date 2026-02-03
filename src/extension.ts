import * as vscode from 'vscode';
import {
  buildSymbolMap,
  saveFileMtime,
  loadFileMtime,
  saveSymbolData,
  loadSymbolData,
  getFileStat,
  getNonSelectedRanges,
} from './util.js';

function isVariableSelection(editor: vscode.TextEditor): boolean {
  const selection = editor.selection;
  if (!selection || selection.isEmpty) {
    return false;
  }

  if (selection.start.line !== selection.end.line) {
    return false;
  }

  const document = editor.document;
  const wordAtPosition = document.getWordRangeAtPosition(selection.start);

  if (!wordAtPosition) {
    return false;
  }

  // Check if the selection exactly matches word boundaries
  return (
    selection.start.character === wordAtPosition.start.character &&
    selection.end.character === wordAtPosition.end.character
  );
}

function getLinesByRanges(ranges: vscode.Range[]): Array<[number, number]> {
  return ranges.reduce<Array<[number, number]>>((cur, acc) => {
    cur.push([acc.start.line, acc.end.line]);
    return cur;
  }, []);
}

async function loadSymbolMap(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): Promise<Map<string, vscode.DocumentSymbol[]>> {
  const documentURI = document.uri;
  let symbolsMap = new Map<string, vscode.DocumentSymbol[]>();
  if (
    (await getFileStat(documentURI)) !== loadFileMtime(context, documentURI)
  ) {
    // Get all symbols in the current document
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >('vscode.executeDocumentSymbolProvider', documentURI);
    if (Array.isArray(symbols) && symbols.length !== 0) {
      buildSymbolMap(symbolsMap, symbols, document.languageId);
      await saveSymbolData(context, documentURI, symbolsMap);
    }
    await saveFileMtime(
      context,
      documentURI,
      (await getFileStat(documentURI)) || 0
    );
  } else {
    symbolsMap = loadSymbolData(context, documentURI);
  }

  return symbolsMap;
}

async function getReadOrWriteHighlights(editor: vscode.TextEditor) {
  // All highlighted locations within the scope of the current document
  const highlights = await vscode.commands.executeCommand<
    vscode.DocumentHighlight[]
  >(
    'vscode.executeDocumentHighlights',
    editor.document.uri,
    editor.selection.start
  );

  return highlights.filter(
    (h) =>
      h.kind === vscode.DocumentHighlightKind.Read ||
      h.kind === vscode.DocumentHighlightKind.Write
  );
}

/**
 * Calculate Decoration Range
 *
 * @param context
 * @param editor
 * @returns
 */
async function calculateRanges(
  context: vscode.ExtensionContext,
  editor: vscode.TextEditor
): Promise<{
  nonSelectedRanges: vscode.Range[];
  selectedLines: Array<[number, number]>;
}> {
  const selectionText = editor.document.getText(editor.selection);

  let symbolsMap = await loadSymbolMap(context, editor.document);
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

function loadSettings() {
  const config = vscode.workspace.getConfiguration();

  const decorationSetting = Object.assign(
    {
      opacity: '0.2',
      backgroundColor: 'transparent',
    } as vscode.ThemableDecorationRenderOptions,
    config.get<vscode.ThemableDecorationRenderOptions>('codeFader.decoration')
  );
  let codeDecoration =
    vscode.window.createTextEditorDecorationType(decorationSetting);

  let isEnabled = config.get<boolean>('codeFader.enabled');
  const isAutoUnfold = config.get<boolean>('codeFader.autoUnfold');

  return { isEnabled, codeDecoration, isAutoUnfold };
}

function subscribeSelectionHighlightBorderChange(
  context: vscode.ExtensionContext
) {
  let isPromptVisible = false;

  async function showReloadPrompt() {
    if (isPromptVisible) { return; }

    isPromptVisible = true;
    const selection = await vscode.window.showInformationMessage(
      'Configuration changes have been detected. Reload now?',
      'Reload'
    );
    isPromptVisible = false;

    if (selection === 'Reload') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  }

  // Listen for Configuration Change Events
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codeFader.enabled')) {
        showReloadPrompt();
      }
    })
  );
}

export async function activate(context: vscode.ExtensionContext) {
  subscribeSelectionHighlightBorderChange(context);

  let { isEnabled, codeDecoration, isAutoUnfold } = loadSettings();

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
      context,
      editor
    );

    if (newVersion !== selectionVersion) {
      return;
    }

    editor.setDecorations(codeDecoration, nonSelectedRanges);

    if (isAutoUnfold && selectedLines.length > 0) {
      selectedLines.forEach(async (line) => {
        await vscode.commands.executeCommand('editor.unfold', {
          levels: 1,
          direction: 'up',
          selectionLines: line,
        });
      });
    }
  });
}

export function deactivate() { }
