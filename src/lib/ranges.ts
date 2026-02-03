import { Range, TextEditor, DocumentHighlight } from 'vscode';

/**
 * Get line numbers by ranges
 */
export function getLinesByRanges(ranges: Range[]): Array<[number, number]> {
  return ranges.reduce<Array<[number, number]>>((cur, acc) => {
    cur.push([acc.start.line, acc.end.line]);
    return cur;
  }, []);
}

/**
 * Get the range of unselected rows
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
