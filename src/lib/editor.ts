import * as vscode from 'vscode';

/**
 * Check if the selection is a single word (variable-like)
 */
export function isVariableSelection(editor: vscode.TextEditor): boolean {
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

/**
 * Get read or write highlights for the current selection
 */
export async function getReadOrWriteHighlights(
  editor: vscode.TextEditor
): Promise<vscode.DocumentHighlight[]> {
  // All highlighted locations within the scope of the current document
  const highlights = await vscode.commands.executeCommand<
    vscode.DocumentHighlight[]
  >(
    'vscode.executeDocumentHighlights',
    editor.document.uri,
    editor.selection.start
  );

  if (!highlights) {
    return [];
  }

  return highlights.filter(
    (h) =>
      h.kind === vscode.DocumentHighlightKind.Read ||
      h.kind === vscode.DocumentHighlightKind.Write
  );
}
