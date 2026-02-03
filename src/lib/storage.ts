import {
  DocumentSymbol,
  Range,
  SymbolKind,
  SymbolTag,
  ExtensionContext,
  Memento,
  Uri,
} from 'vscode';

export interface ISerializedSymbol {
  name: string;
  detail: string;
  kind: number;
  tags?: number[];
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: ISerializedSymbol[];
}

/**
 * Explicitly extract all properties
 */
export function serializeSymbolMap(
  map: Map<string, DocumentSymbol[]>
): Array<[string, ISerializedSymbol[]]> {
  const entries = Array.from(map);

  // Convert the Map entry into a serializable intermediate structure
  const serializableEntries = entries.map(([key, symbols]) => {
    return [key, symbols.map(toSerializableSymbol)] as [
      string,
      ISerializedSymbol[],
    ];
  });

  return serializableEntries;
}

/**
 * Restoring the intermediate structure to a VS Code typing instance
 */
export function deserializeSymbolMap(
  rawData: Array<[string, ISerializedSymbol[]]>
): Map<string, DocumentSymbol[]> {
  const map = new Map<string, DocumentSymbol[]>();
  if (!Array.isArray(rawData)) {
    return map;
  }

  for (const [key, rawSymbols] of rawData) {
    if (Array.isArray(rawSymbols)) {
      map.set(key, rawSymbols.map(reviveDocumentSymbol));
    }
  }
  return map;
}

/**
 * Convert a DocumentSymbol instance to a plain JSON object
 */
function toSerializableSymbol(symbol: DocumentSymbol): ISerializedSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: symbol.kind,
    tags: symbol.tags ? symbol.tags.map((t) => t) : undefined,
    range: {
      start: {
        line: symbol.range.start.line,
        character: symbol.range.start.character,
      },
      end: {
        line: symbol.range.end.line,
        character: symbol.range.end.character,
      },
    },
    selectionRange: {
      start: {
        line: symbol.selectionRange.start.line,
        character: symbol.selectionRange.start.character,
      },
      end: {
        line: symbol.selectionRange.end.line,
        character: symbol.selectionRange.end.character,
      },
    },
    children: symbol.children ? symbol.children.map(toSerializableSymbol) : [],
  };
}

/**
 * Restore a pure JSON object to a DocumentSymbol instance
 */
function reviveDocumentSymbol(raw: ISerializedSymbol): DocumentSymbol {
  const range = new Range(
    raw.range.start.line,
    raw.range.start.character,
    raw.range.end.line,
    raw.range.end.character
  );

  const selectionRange = new Range(
    raw.selectionRange.start.line,
    raw.selectionRange.start.character,
    raw.selectionRange.end.line,
    raw.selectionRange.end.character
  );

  const ds = new DocumentSymbol(
    raw.name,
    raw.detail,
    raw.kind as SymbolKind,
    range,
    selectionRange
  );

  if (raw.tags) {
    ds.tags = raw.tags as SymbolTag[];
  }

  if (raw.children) {
    ds.children = raw.children.map(reviveDocumentSymbol);
  }

  return ds;
}

export class SymbolStore {
  constructor(private context: ExtensionContext) {}

  private get memento(): Memento {
    return this.context.workspaceState;
  }

  async saveSymbolData(docURI: Uri, symbolMap: Map<string, DocumentSymbol[]>) {
    await this.memento.update(
      'symbolMap|' + docURI.toString(),
      serializeSymbolMap(symbolMap)
    );
  }

  loadSymbolData(docURI: Uri): Map<string, DocumentSymbol[]> {
    const data = this.memento.get<Array<[string, ISerializedSymbol[]]>>(
      'symbolMap|' + docURI.toString()
    );
    if (!data) {
      return new Map<string, DocumentSymbol[]>();
    }
    return deserializeSymbolMap(data);
  }

  async saveFileMtime(uri: Uri, mtime: number) {
    await this.memento.update('fileMtime|' + uri.toString(), mtime);
  }

  loadFileMtime(uri: Uri): number | undefined {
    return this.memento.get<number>('fileMtime|' + uri.toString());
  }
}
