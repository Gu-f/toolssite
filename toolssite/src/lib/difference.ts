export type DifferenceSegmentType = 'same' | 'add' | 'remove';

export type DifferenceSegment = {
  readonly type: DifferenceSegmentType;
  readonly text: string;
};

export type DifferenceLineType = 'same' | 'add' | 'remove';

export type DifferenceLine = {
  readonly type: DifferenceLineType;
  readonly text: string;
  readonly segments?: readonly DifferenceSegment[];
};

export type DiffViewMode = 'unified' | 'split';

export type DifferenceSplitRowType = 'same' | 'change' | 'remove' | 'add';

export type DifferenceSplitRow = {
  readonly type: DifferenceSplitRowType;
  readonly left: DifferenceLine | null;
  readonly right: DifferenceLine | null;
};

export const MAX_DIFF_LINES = 5000;
const MAX_LINE_DIFF_CELLS = 16_000_000;
const MAX_CHARACTER_DIFF_CELLS = 2_000_000;
const MAX_CHARACTER_DIFF_LINE_LENGTH = 256;

type WorkBudget = {
  remainingCells: number;
};

function createSegment(type: DifferenceSegmentType, text: string): DifferenceSegment {
  return { type, text };
}

function toCodePoints(value: string): string[] {
  return Array.from(value);
}

function lcsLengthRow(
  first: readonly string[],
  second: readonly string[],
  budget: WorkBudget,
): Uint32Array | null {
  const requiredCells = (first.length + 1) * (second.length + 1);
  if (requiredCells > budget.remainingCells) {
    return null;
  }

  budget.remainingCells -= requiredCells;
  const row = new Uint32Array(second.length + 1);

  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    let diagonalLength = 0;

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const previousLength = row[secondIndex + 1];
      if (first[firstIndex] === second[secondIndex]) {
        row[secondIndex + 1] = diagonalLength + 1;
      } else {
        row[secondIndex + 1] = Math.max(row[secondIndex + 1], row[secondIndex]);
      }
      diagonalLength = previousLength;
    }
  }

  return row;
}

function collectMatchesCore(
  first: readonly string[],
  second: readonly string[],
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
  matches: Array<[number, number]>,
  budget: WorkBudget,
): boolean {
  while (firstStart < firstEnd && secondStart < secondEnd
    && first[firstStart] === second[secondStart]) {
    matches.push([firstStart, secondStart]);
    firstStart += 1;
    secondStart += 1;
  }

  const suffixMatches: Array<[number, number]> = [];
  while (firstStart < firstEnd && secondStart < secondEnd
    && first[firstEnd - 1] === second[secondEnd - 1]) {
    firstEnd -= 1;
    secondEnd -= 1;
    suffixMatches.push([firstEnd, secondEnd]);
  }

  if (firstStart >= firstEnd || secondStart >= secondEnd) {
    suffixMatches.reverse().forEach((match) => matches.push(match));
    return true;
  }

  const firstLength = firstEnd - firstStart;
  if (firstLength === 1) {
    const item = first[firstStart];
    for (let secondIndex = secondStart; secondIndex < secondEnd; secondIndex += 1) {
      if (second[secondIndex] === item) {
        matches.push([firstStart, secondIndex]);
        break;
      }
    }

    suffixMatches.reverse().forEach((match) => matches.push(match));
    return true;
  }

  const middle = firstStart + Math.floor(firstLength / 2);
  const forwardRow = lcsLengthRow(
    first.slice(firstStart, middle),
    second.slice(secondStart, secondEnd),
    budget,
  );
  const backwardRow = lcsLengthRow(
    first.slice(middle, firstEnd).reverse(),
    second.slice(secondStart, secondEnd).reverse(),
    budget,
  );

  if (!forwardRow || !backwardRow) {
    return false;
  }

  const secondLength = secondEnd - secondStart;
  let bestSplit = secondStart;
  let bestLength = -1;
  for (let offset = 0; offset <= secondLength; offset += 1) {
    const length = forwardRow[offset] + backwardRow[secondLength - offset];
    if (length > bestLength) {
      bestLength = length;
      bestSplit = secondStart + offset;
    }
  }

  const isLeftComplete = collectMatchesCore(
    first,
    second,
    firstStart,
    middle,
    secondStart,
    bestSplit,
    matches,
    budget,
  );
  const isRightComplete = isLeftComplete && collectMatchesCore(
    first,
    second,
    middle,
    firstEnd,
    bestSplit,
    secondEnd,
    matches,
    budget,
  );

  if (!isRightComplete) {
    return false;
  }

  suffixMatches.reverse().forEach((match) => matches.push(match));
  return true;
}

/**
 * Find longest-common-subsequence matches. Returns `null` when the input is
 * too large for the remaining work budget so callers can use a safe fallback.
 */
function findCommonMatches(
  first: readonly string[],
  second: readonly string[],
  budget: WorkBudget,
): Array<[number, number]> | null {
  const matches: Array<[number, number]> = [];
  const isComplete = collectMatchesCore(
    first,
    second,
    0,
    first.length,
    0,
    second.length,
    matches,
    budget,
  );

  return isComplete ? matches : null;
}

function findPositionalMatches(
  firstLength: number,
  secondLength: number,
): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  const length = Math.min(firstLength, secondLength);

  for (let index = 0; index < length; index += 1) {
    matches.push([index, index]);
  }

  return matches;
}

function findSegments(
  original: string,
  modified: string,
  budget: WorkBudget,
): { left: DifferenceSegment[]; right: DifferenceSegment[] } | null {
  if (original === '' || modified === '') {
    return null;
  }

  if (original.length > MAX_CHARACTER_DIFF_LINE_LENGTH
    || modified.length > MAX_CHARACTER_DIFF_LINE_LENGTH) {
    return null;
  }

  const originalChars = toCodePoints(original);
  const modifiedChars = toCodePoints(modified);
  const matches = findCommonMatches(originalChars, modifiedChars, budget);

  if (!matches) {
    let prefixLength = 0;
    while (prefixLength < originalChars.length && prefixLength < modifiedChars.length
      && originalChars[prefixLength] === modifiedChars[prefixLength]) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    while (suffixLength < originalChars.length - prefixLength
      && suffixLength < modifiedChars.length - prefixLength
      && originalChars[originalChars.length - 1 - suffixLength]
        === modifiedChars[modifiedChars.length - 1 - suffixLength]) {
      suffixLength += 1;
    }

    const left = [
      createSegment('same', originalChars.slice(0, prefixLength).join('')),
      createSegment('remove', originalChars.slice(prefixLength, originalChars.length - suffixLength).join('')),
      createSegment('same', originalChars.slice(originalChars.length - suffixLength).join('')),
    ].filter((segment) => segment.text !== '');
    const right = [
      createSegment('same', modifiedChars.slice(0, prefixLength).join('')),
      createSegment('add', modifiedChars.slice(prefixLength, modifiedChars.length - suffixLength).join('')),
      createSegment('same', modifiedChars.slice(modifiedChars.length - suffixLength).join('')),
    ].filter((segment) => segment.text !== '');

    return { left, right };
  }

  const left: DifferenceSegment[] = [];
  const right: DifferenceSegment[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;

  const addUnmatched = (endOriginal: number, endModified: number) => {
    if (originalIndex < endOriginal) {
      left.push({
        type: 'remove',
        text: originalChars.slice(originalIndex, endOriginal).join(''),
      });
    }
    if (modifiedIndex < endModified) {
      right.push({
        type: 'add',
        text: modifiedChars.slice(modifiedIndex, endModified).join(''),
      });
    }
    originalIndex = endOriginal;
    modifiedIndex = endModified;
  };

  matches.forEach(([matchOriginal, matchModified]) => {
    addUnmatched(matchOriginal, matchModified);
    left.push({ type: 'same', text: originalChars[matchOriginal] });
    right.push({ type: 'same', text: modifiedChars[matchModified] });
    originalIndex = matchOriginal + 1;
    modifiedIndex = matchModified + 1;
  });

  addUnmatched(originalChars.length, modifiedChars.length);

  return { left, right };
}

function mergeSegments(segments: readonly DifferenceSegment[]): DifferenceSegment[] {
  const merged: DifferenceSegment[] = [];

  segments.forEach((segment) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.type === segment.type) {
      merged[merged.length - 1] = {
        type: previous.type,
        text: previous.text + segment.text,
      };
      return;
    }

    merged.push({ ...segment });
  });

  return merged.filter((segment) => segment.text !== '');
}

export function compareLines(original: string, modified: string): DifferenceLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const maxLength = Math.min(
    Math.max(originalLines.length, modifiedLines.length),
    MAX_DIFF_LINES,
  );
  const budget: WorkBudget = { remainingCells: MAX_LINE_DIFF_CELLS };
  const characterBudget: WorkBudget = {
    remainingCells: MAX_CHARACTER_DIFF_CELLS,
  };
  const matches = findCommonMatches(originalLines, modifiedLines, budget)
    ?? findPositionalMatches(Math.min(originalLines.length, maxLength), Math.min(modifiedLines.length, maxLength));
  const result: DifferenceLine[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;
  let matchIndex = 0;

  while (originalIndex < maxLength || modifiedIndex < maxLength) {
    const match = matches[matchIndex];
    if (match && match[0] === originalIndex && match[1] === modifiedIndex) {
      matchIndex += 1;
      const originalLine = originalLines[originalIndex];
      const modifiedLine = modifiedLines[modifiedIndex];

      if (originalLine === modifiedLine) {
        result.push({ type: 'same', text: originalLine });
      } else {
        const segments = findSegments(originalLine, modifiedLine, characterBudget);
        result.push({
          type: 'remove',
          text: originalLine,
          ...(segments ? { segments: mergeSegments(segments.left) } : {}),
        });
        result.push({
          type: 'add',
          text: modifiedLine,
          ...(segments ? { segments: mergeSegments(segments.right) } : {}),
        });
      }

      originalIndex += 1;
      modifiedIndex += 1;
      continue;
    }

    const originalRunEnd = match
      ? Math.min(match[0], maxLength)
      : Math.min(originalLines.length, maxLength);
    const modifiedRunEnd = match
      ? Math.min(match[1], maxLength)
      : Math.min(modifiedLines.length, maxLength);
    const runLength = Math.max(
      originalRunEnd - originalIndex,
      modifiedRunEnd - modifiedIndex,
    );

    if (runLength <= 0) {
      break;
    }

    for (let offset = 0; offset < runLength; offset += 1) {
      const hasOriginal = originalIndex < originalRunEnd
        && originalIndex < originalLines.length;
      const hasModified = modifiedIndex < modifiedRunEnd
        && modifiedIndex < modifiedLines.length;

      if (!hasOriginal) {
        result.push({ type: 'add', text: modifiedLines[modifiedIndex] });
        modifiedIndex += 1;
        continue;
      }

      if (!hasModified) {
        result.push({ type: 'remove', text: originalLines[originalIndex] });
        originalIndex += 1;
        continue;
      }

      const originalLine = originalLines[originalIndex];
      const modifiedLine = modifiedLines[modifiedIndex];
      if (originalLine === modifiedLine) {
        result.push({ type: 'same', text: originalLine });
      } else {
        const segments = findSegments(originalLine, modifiedLine, characterBudget);
        result.push({
          type: 'remove',
          text: originalLine,
          ...(segments ? { segments: mergeSegments(segments.left) } : {}),
        });
        result.push({
          type: 'add',
          text: modifiedLine,
          ...(segments ? { segments: mergeSegments(segments.right) } : {}),
        });
      }

      originalIndex += 1;
      modifiedIndex += 1;
    }
  }

  return result;
}

export function buildSplitRows(diff: readonly DifferenceLine[]): DifferenceSplitRow[] {
  const rows: DifferenceSplitRow[] = [];

  for (let index = 0; index < diff.length; index += 1) {
    const line = diff[index];

    if (line.type === 'remove' && diff[index + 1]?.type === 'add') {
      rows.push({ type: 'change', left: line, right: diff[index + 1] });
      index += 1;
      continue;
    }

    if (line.type === 'same') {
      rows.push({ type: 'same', left: line, right: line });
    } else if (line.type === 'remove') {
      rows.push({ type: 'remove', left: line, right: null });
    } else {
      rows.push({ type: 'add', left: null, right: line });
    }
  }

  return rows;
}
