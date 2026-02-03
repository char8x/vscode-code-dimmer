import * as vscode from 'vscode';

export interface Settings {
  isEnabled: boolean | undefined;
  codeDecoration: vscode.TextEditorDecorationType;
  isAutoUnfold: boolean | undefined;
}

/**
 * Load settings from VS Code configuration
 */
export function loadSettings(): Settings {
  const config = vscode.workspace.getConfiguration();

  const decorationSetting = Object.assign(
    {
      opacity: '0.2',
      backgroundColor: 'transparent',
    } as vscode.ThemableDecorationRenderOptions,
    config.get<vscode.ThemableDecorationRenderOptions>('codeFader.decoration')
  );

  const codeDecoration =
    vscode.window.createTextEditorDecorationType(decorationSetting);

  const isEnabled = config.get<boolean>('codeFader.enabled');
  const isAutoUnfold = config.get<boolean>('codeFader.autoUnfold');

  return { isEnabled, codeDecoration, isAutoUnfold };
}

/**
 * Subscribe to configuration changes and prompt for reload if necessary
 */
export function subscribeSelectionHighlightBorderChange(
  context: vscode.ExtensionContext
) {
  let isPromptVisible = false;

  async function showReloadPrompt() {
    if (isPromptVisible) {
      return;
    }

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
