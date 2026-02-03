import { describe, it, expect, vi } from 'vitest';
import './mocks/vscode';
import { getLinesByRanges, getNonSelectedRanges } from '../../lib/ranges';
import * as vscode from 'vscode';

describe('ranges utility', () => {
  describe('getLinesByRanges', () => {
    it('should convert ranges to line index pairs', () => {
      const ranges = [
        new vscode.Range(0, 0, 0, 10),
        new vscode.Range(5, 2, 7, 5),
      ];
      const result = getLinesByRanges(ranges);
      expect(result).toEqual([
        [0, 0],
        [5, 7],
      ]);
    });

    it('should return empty array for empty ranges', () => {
      expect(getLinesByRanges([])).toEqual([]);
    });
  });

  describe('getNonSelectedRanges', () => {
    const mockEditor = (lineCount: number) =>
      ({
        document: {
          lineCount,
          lineAt: (i: number) => ({
            range: new vscode.Range(i, 0, i, 10),
          }),
        },
      }) as any as vscode.TextEditor;

    it('should return all lines when no lines are selected', () => {
      const editor = mockEditor(3);
      const { nonSelectedRanges, selectedLines } = getNonSelectedRanges(
        editor,
        []
      );
      expect(nonSelectedRanges.length).toBe(3);
      expect(selectedLines).toEqual([]);
      expect(nonSelectedRanges[0].start.line).toBe(0);
      expect(nonSelectedRanges[1].start.line).toBe(1);
      expect(nonSelectedRanges[2].start.line).toBe(2);
    });

    it('should return remaining lines when some are selected', () => {
      const editor = mockEditor(5);
      const selected = [[1, 2]] as Array<[number, number]>;
      const { nonSelectedRanges, selectedLines } = getNonSelectedRanges(
        editor,
        selected
      );

      // Lines 0, 3, 4 should be returned
      expect(nonSelectedRanges.length).toBe(3);
      expect(nonSelectedRanges[0].start.line).toBe(0);
      expect(nonSelectedRanges[1].start.line).toBe(3);
      expect(nonSelectedRanges[2].start.line).toBe(4);
      expect(selectedLines).toEqual([[1, 2]]);
    });

    it('should merge overlapping or adjacent selected lines', () => {
      const editor = mockEditor(10);
      const selected = [
        [1, 2],
        [2, 4],
        [6, 7],
      ] as Array<[number, number]>;
      const { nonSelectedRanges, selectedLines } = getNonSelectedRanges(
        editor,
        selected
      );

      // Merged selected: [1, 4], [6, 7]
      // Remaining: 0, 5, 8, 9
      expect(selectedLines).toEqual([
        [1, 4],
        [6, 7],
      ]);
      expect(nonSelectedRanges.map((r) => r.start.line)).toEqual([0, 5, 8, 9]);
    });

    it('should handle selection at the boundaries', () => {
      const editor = mockEditor(5);
      const selected = [
        [0, 0],
        [4, 4],
      ] as Array<[number, number]>;
      const { nonSelectedRanges, selectedLines } = getNonSelectedRanges(
        editor,
        selected
      );

      expect(selectedLines).toEqual([
        [0, 0],
        [4, 4],
      ]);
      expect(nonSelectedRanges.map((r) => r.start.line)).toEqual([1, 2, 3]);
    });
  });
});
