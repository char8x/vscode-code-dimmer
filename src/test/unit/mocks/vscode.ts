import { vi } from 'vitest';

export class Position {
  constructor(
    public line: number,
    public character: number
  ) {}
  isBefore(other: Position): boolean {
    if (this.line < other.line) {return true;}
    if (this.line > other.line) {return false;}
    return this.character < other.character;
  }
}

export class Range {
  start: Position;
  end: Position;
  constructor(
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
  ) {
    this.start = new Position(startLine, startChar);
    this.end = new Position(endLine, endChar);
  }
  isEqual(other: Range): boolean {
    return (
      this.start.line === other.start.line &&
      this.start.character === other.start.character &&
      this.end.line === other.end.line &&
      this.end.character === other.end.character
    );
  }
}

export const vscode = {
  Position,
  Range,
  window: {
    activeTextEditor: undefined,
  },
};

vi.mock('vscode', () => vscode);
