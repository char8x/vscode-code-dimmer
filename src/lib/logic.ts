import * as vscode from 'vscode';
import { SymbolManager } from './symbols.js';
import { getLinesByRanges, getNonSelectedRanges } from './ranges.js';
import { getReadOrWriteHighlights } from './editor.js';

/**
 * Calculate Decoration Range
 *
 * @param symbolManager
 * @param editor
 * @returns
 */
export async function calculateRanges(
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
