import {
  commands,
  DocumentSymbol,
  SymbolKind,
  TextDocument,
  Uri,
} from 'vscode';
import { getFileStat } from './fs.js';
import { SymbolStore } from './storage.js';

const GoMethodSymboRegex = /^\([^)]+\)\.[A-Za-z0-9_]+$/;

/**
 * Build symbol map from DocumentSymbol array
 */
export function buildSymbolMap(
  symbolMap: Map<string, DocumentSymbol[]>,
  symbols: DocumentSymbol[],
  languageId: string
): void {
  symbols.forEach((sym) => {
    let symName = sym.name;
    if (
      languageId === 'go' &&
      sym.kind === SymbolKind.Method &&
      GoMethodSymboRegex.test(symName)
    ) {
      symName = symName.substring(symName.indexOf('.') + 1);
    }
    if (!symbolMap.has(symName)) {
      symbolMap.set(symName, [sym]);
    } else {
      symbolMap.get(symName)?.push(sym);
    }
    if (sym.children && sym.children.length > 0) {
      buildSymbolMap(symbolMap, sym.children, languageId);
    }
  });
}

export class SymbolManager {
  private store: SymbolStore;

  constructor(store: SymbolStore) {
    this.store = store;
  }

  async loadSymbolMap(
    document: TextDocument
  ): Promise<Map<string, DocumentSymbol[]>> {
    const documentURI = document.uri;
    const currentMtime = await getFileStat(documentURI);
    const cachedMtime = this.store.loadFileMtime(documentURI);

    if (currentMtime !== cachedMtime) {
      // Get all symbols in the current document
      const symbols = await commands.executeCommand<DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        documentURI
      );

      let symbolsMap = new Map<string, DocumentSymbol[]>();
      if (Array.isArray(symbols) && symbols.length !== 0) {
        buildSymbolMap(symbolsMap, symbols, document.languageId);
        await this.store.saveSymbolData(documentURI, symbolsMap);
      }
      await this.store.saveFileMtime(documentURI, currentMtime || 0);
      return symbolsMap;
    } else {
      return this.store.loadSymbolData(documentURI);
    }
  }
}
