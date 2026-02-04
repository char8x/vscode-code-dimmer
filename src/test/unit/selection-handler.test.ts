import { describe, it, expect, vi, beforeEach } from 'vitest';
import './mocks/vscode.js';
import * as vscode from 'vscode';
import { SelectionHandler } from '../../lib/selectionHandler.js';
import * as editorUtils from '../../lib/editor.js';
import * as logicUtils from '../../lib/logic.js';

// Mock dependencies
vi.mock('../../lib/editor.js', () => ({
  isVariableSelection: vi.fn(),
  getReadOrWriteHighlights: vi.fn(),
}));

vi.mock('../../lib/logic.js', () => ({
  calculateRanges: vi.fn(),
}));

describe('SelectionHandler', () => {
  let mockSymbolManager: any;
  let mockSettings: any;
  let handler: SelectionHandler;
  let mockEditor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSymbolManager = {};
    mockSettings = {
      isEnabled: true,
      codeDecoration: { key: 'mockDecoration' } as any,
      isAutoUnfold: true,
    };
    handler = new SelectionHandler(mockSymbolManager, () => mockSettings);
    mockEditor = {
      setDecorations: vi.fn(),
      document: { uri: 'mockUri' },
      selection: { start: { line: 0, character: 0 } },
    };
  });

  it('should clear decorations and return if not enabled', async () => {
    mockSettings.isEnabled = false;
    const event = { textEditor: mockEditor } as any;

    await handler.handleSelectionChange(event);

    expect(mockEditor.setDecorations).toHaveBeenCalledWith(
      mockSettings.codeDecoration,
      []
    );
  });

  it('should ignore non-mouse selection changes unless selection is empty', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Keyboard,
      selections: [{ isEmpty: false }],
    } as any;

    await handler.handleSelectionChange(event);

    expect(mockEditor.setDecorations).not.toHaveBeenCalled();
    expect(editorUtils.isVariableSelection).not.toHaveBeenCalled();
  });

  it('should clear decorations on non-mouse change if selection is empty', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Keyboard,
      selections: [{ isEmpty: true }],
    } as any;

    await handler.handleSelectionChange(event);

    expect(mockEditor.setDecorations).toHaveBeenCalledWith(
      mockSettings.codeDecoration,
      []
    );
  });

  it('should clear decorations if not a variable selection', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Mouse,
    } as any;
    (editorUtils.isVariableSelection as any).mockReturnValue(false);

    await handler.handleSelectionChange(event);

    expect(mockEditor.setDecorations).toHaveBeenCalledWith(
      mockSettings.codeDecoration,
      []
    );
  });

  it('should calculate and set decorations for variable selection', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Mouse,
    } as any;
    (editorUtils.isVariableSelection as any).mockReturnValue(true);
    (logicUtils.calculateRanges as any).mockResolvedValue({
      nonSelectedRanges: [new vscode.Range(0, 0, 0, 5)],
      selectedLines: [],
    });

    await handler.handleSelectionChange(event);

    expect(logicUtils.calculateRanges).toHaveBeenCalled();
    expect(mockEditor.setDecorations).toHaveBeenCalledWith(
      mockSettings.codeDecoration,
      [expect.any(vscode.Range)]
    );
  });

  it('should handle selection versioning (concurrency)', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Mouse,
    } as any;
    (editorUtils.isVariableSelection as any).mockReturnValue(true);

    let resolveFirst: any;
    const firstCallPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    (logicUtils.calculateRanges as any)
      .mockImplementationOnce(() => firstCallPromise)
      .mockResolvedValueOnce({
        nonSelectedRanges: [new vscode.Range(1, 0, 1, 5)],
        selectedLines: [],
      });

    const p1 = handler.handleSelectionChange(event);
    const p2 = handler.handleSelectionChange(event);

    // Resolve first call's promise with some results
    resolveFirst({
      nonSelectedRanges: [new vscode.Range(0, 0, 0, 5)],
      selectedLines: [],
    });

    await Promise.all([p1, p2]);

    // Only the second call (latest version) should have applied decorations
    expect(mockEditor.setDecorations).toHaveBeenCalledTimes(1);
    expect(mockEditor.setDecorations).toHaveBeenCalledWith(
      mockSettings.codeDecoration,
      [expect.objectContaining({ start: expect.objectContaining({ line: 1 }) })]
    );
  });

  it('should unfold lines if isAutoUnfold is enabled', async () => {
    const event = {
      textEditor: mockEditor,
      kind: vscode.TextEditorSelectionChangeKind.Mouse,
    } as any;
    (editorUtils.isVariableSelection as any).mockReturnValue(true);
    (logicUtils.calculateRanges as any).mockResolvedValue({
      nonSelectedRanges: [],
      selectedLines: [[10, 20]],
    });

    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand');

    await handler.handleSelectionChange(event);

    expect(executeCommandSpy).toHaveBeenCalledWith('editor.unfold', {
      levels: 1,
      direction: 'up',
      selectionLines: [10, 20],
    });
  });
});
