import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { getDocUri, activate } from './helper.js';
// import * as myExtension from '../../extension';

// Create test files in memory
const testUri = vscode.Uri.parse('untitled:testFile.txt');

/**
 * Open a new text document and obtain the editor instance
 *
 * @returns
 */
async function setupTestEditor(): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument(testUri);
  const editor = await vscode.window.showTextDocument(document);
  // Ensure the editor is active
  await new Promise((resolve) => setTimeout(resolve, 50));
  return editor;
}

suite('Extension Test Suite', () => {
  // vscode.window.showInformationMessage('Start all tests.');

  // test('Sample test', () => {
  // 	assert.strictEqual(-1, [1, 2, 3].indexOf(5));
  // 	assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  // });

  test('Selection and Command Trigger Test', async () => {
    const editor = await setupTestEditor();
    const textToInsert = 'Hello World!\nThis is a test line.\nAnother line.';

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), textToInsert);
    });

    const startPos = new vscode.Position(1, 0);
    const endPos = new vscode.Position(1, 20);

    editor.selection = new vscode.Selection(startPos, endPos);

    assert.strictEqual(
      editor.selection.start.line,
      1,
      'Selection start line should be 1'
    );
    assert.strictEqual(
      editor.selection.end.character,
      20,
      'Selection end char should be 20'
    );

    await vscode.commands.executeCommand('editor.action.transformToUppercase');

    const expectedText = 'Hello World!\nTHIS IS A TEST LINE.\nAnother line.';

    assert.strictEqual(
      editor.document.getText(),
      expectedText,
      'Document content should be transformed'
    );

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
