import {
  DocumentSymbol,
  Range,
  SymbolKind,
  SymbolTag,
  Uri,
  Memento,
  ExtensionContext,
  workspace,
  TextEditor,
} from 'vscode';

export async function saveSymbolData(
  context: ExtensionContext,
  docURI: Uri,
  symbolMap: Map<string, DocumentSymbol[]>
) {
  const memento: Memento = context.workspaceState;
  await memento.update(
    'symbolMap|' + docURI.toString(),
    serializeSymbolMap(symbolMap)
  );
}

export function loadSymbolData(
  context: ExtensionContext,
  docURI: Uri
): Map<string, DocumentSymbol[]> {
  const memento: Memento = context.workspaceState;
  const data = memento.get<Array<[string, ISerializedSymbol[]]>>(
    'symbolMap|' + docURI.toString()
  );
  if (!data) {
    return new Map<string, DocumentSymbol[]>();
  }
  return deserializeSymbolMap(data);
}

export async function saveFileMtime(
  context: ExtensionContext,
  uri: Uri,
  mtime: number
) {
  const memento: Memento = context.workspaceState;
  await memento.update('fileMtime|' + uri.toString(), mtime);
}

export function loadFileMtime(
  context: ExtensionContext,
  uri: Uri
): number | undefined {
  const memento: Memento = context.workspaceState;
  return memento.get<number>('fileMtime|' + uri.toString());
}

export async function getFileStat(uri: Uri): Promise<number | undefined> {
  try {
    const stat = await workspace.fs.stat(uri);
    return stat.mtime;
  } catch (error) {
    return undefined;
  }
}

interface ISerializedSymbol {
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
 *
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

const GoMethodSymboRegex = /^\([^)]+\)\.[A-Za-z0-9_]+$/;

/**
 * Build symbol map from DocumentSymbol array
 *
 * Note special character naming:
 * 1. `<function>` an anonymous function, such as the function within the Promise constructor parameters.
 * 2. `xxxx callback` Represents a global callback function, such as a `setTimeout()` callback.
 *
 * @param symbolMap
 * @param symbols
 */
export function buildSymbolMap(
  symbolMap: Map<string, DocumentSymbol[]>,
  symbols: DocumentSymbol[],
  languageId: string
): void {
  let symName: string;
  symbols.forEach((sym) => {
    symName = sym.name;
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

/**
 * Get the range of unselected rows
 *
 * @param editor
 * @param lines
 * @returns {
 *  nonSelectedRanges: Range[];
 *  selectedLines: Array<[number, number]>;
 * }
 */
export function getNonSelectedRanges(
  editor: TextEditor,
  lines: Array<[number, number]>
): { nonSelectedRanges: Range[]; selectedLines: Array<[number, number]> } {
  const nonSelectedRanges: Range[] = [];
  const doc = editor.document;
  const lineCount = doc.lineCount;

  if (lines.length === 0) {
    for (let i = 0; i < lineCount; i++) {
      nonSelectedRanges.push(doc.lineAt(i).range);
    }
    return { nonSelectedRanges, selectedLines: [] };
  }

  const sortedIntervals = [...lines].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];

  let [currStart, currEnd] = sortedIntervals[0];
  for (let i = 1; i < sortedIntervals.length; i++) {
    const [nextStart, nextEnd] = sortedIntervals[i];
    if (nextStart <= currEnd + 1) {
      currEnd = Math.max(currEnd, nextEnd);
    } else {
      merged.push([currStart, currEnd]);
      [currStart, currEnd] = [nextStart, nextEnd];
    }
  }
  merged.push([currStart, currEnd]);

  let currentLine = 0;

  for (const [start, end] of merged) {
    for (let i = currentLine; i < start; i++) {
      if (i < lineCount) {
        nonSelectedRanges.push(doc.lineAt(i).range);
      }
    }
    currentLine = Math.max(currentLine, end + 1);
  }

  for (let i = currentLine; i < lineCount; i++) {
    nonSelectedRanges.push(doc.lineAt(i).range);
  }

  return { nonSelectedRanges, selectedLines: merged };
}
