import { describe, it, expect, vi, beforeEach } from 'vitest';
import './mocks/vscode';
import * as vscode from 'vscode';
import { calculateRanges } from '../../lib/logic';
import * as editorUtils from '../../lib/editor';

// Mock dependencies
vi.mock('../../lib/editor', () => ({
  getReadOrWriteHighlights: vi.fn(),
  isVariableSelection: vi.fn(),
}));

describe('calculateRanges logic', () => {
  let mockSymbolManager: any;
  let mockEditor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSymbolManager = {
      loadSymbolMap: vi.fn(),
    };
    mockEditor = {
      selection: new vscode.Range(1, 5, 1, 10),
      document: {
        getText: vi.fn(),
        lineCount: 10,
        lineAt: vi.fn((i) => ({
          range: new vscode.Range(i, 0, i, 100),
        })),
      },
    };
  });

  it('should return empty ranges if there is only one highlight and no symbols', async () => {
    mockEditor.document.getText.mockReturnValue('myVar');
    mockSymbolManager.loadSymbolMap.mockResolvedValue(new Map());
    (editorUtils.getReadOrWriteHighlights as any).mockResolvedValue([
      { range: new vscode.Range(1, 5, 1, 10) },
    ]);

    const result = await calculateRanges(
      mockSymbolManager as any,
      mockEditor as any
    );
    expect(result.nonSelectedRanges).toEqual([]);
    expect(result.selectedLines).toEqual([]);
  });

  it('should use symbol declaration range when selection matches a symbol exactly (Case 1)', async () => {
    const selectionRange = new vscode.Range(1, 5, 1, 10);
    const symbolDeclarationRange = new vscode.Range(0, 0, 5, 0); // Symbol spans multiple lines

    mockEditor.selection = selectionRange;
    mockEditor.document.getText.mockReturnValue('myVar');

    const symbolsMap = new Map();
    symbolsMap.set('myVar', [
      {
        selectionRange,
        range: symbolDeclarationRange,
      },
    ]);
    mockSymbolManager.loadSymbolMap.mockResolvedValue(symbolsMap);

    (editorUtils.getReadOrWriteHighlights as any).mockResolvedValue([
      { range: selectionRange },
      { range: new vscode.Range(3, 5, 3, 10) },
    ]);

    const result = await calculateRanges(
      mockSymbolManager as any,
      mockEditor as any
    );

    // Result should include symbolRange [0, 5] and highlight range [3, 3]
    // Merged selected lines: [0, 5]
    expect(result.selectedLines).toEqual([[0, 5]]);
    // nonSelectedRanges should be lines 6 to 9
    expect(result.nonSelectedRanges.map((r) => r.start.line)).toEqual([
      6, 7, 8, 9,
    ]);
  });

  it('should use intersection symbol when highlights cover symbol definition (Case 2)', async () => {
    const selectionRange = new vscode.Range(3, 5, 3, 10);
    const symbolSelectionRange = new vscode.Range(1, 5, 1, 10);
    const symbolDeclarationRange = new vscode.Range(0, 0, 5, 0);

    mockEditor.selection = selectionRange;
    mockEditor.document.getText.mockReturnValue('myVar');

    const symbolsMap = new Map();
    symbolsMap.set('myVar', [
      {
        selectionRange: symbolSelectionRange,
        range: symbolDeclarationRange,
      },
    ]);
    mockSymbolManager.loadSymbolMap.mockResolvedValue(symbolsMap);

    // Highlights include the symbol's definition site
    (editorUtils.getReadOrWriteHighlights as any).mockResolvedValue([
      { range: symbolSelectionRange },
      { range: selectionRange },
    ]);

    const result = await calculateRanges(
      mockSymbolManager as any,
      mockEditor as any
    );

    expect(result.selectedLines).toEqual([[0, 5]]);
    expect(result.nonSelectedRanges.map((r) => r.start.line)).toEqual([
      6, 7, 8, 9,
    ]);
  });

  it('should fall back to highlights only when no symbols match', async () => {
    mockEditor.document.getText.mockReturnValue('myVar');
    mockSymbolManager.loadSymbolMap.mockResolvedValue(new Map());

    (editorUtils.getReadOrWriteHighlights as any).mockResolvedValue([
      { range: new vscode.Range(1, 5, 1, 10) },
      { range: new vscode.Range(3, 5, 3, 10) },
    ]);

    const result = await calculateRanges(
      mockSymbolManager as any,
      mockEditor as any
    );

    // Merged selected lines: [1, 1] and [3, 3]
    expect(result.selectedLines).toEqual([
      [1, 1],
      [3, 3],
    ]);
    expect(result.nonSelectedRanges.map((r) => r.start.line)).toEqual([
      0, 2, 4, 5, 6, 7, 8, 9,
    ]);
  });
});
