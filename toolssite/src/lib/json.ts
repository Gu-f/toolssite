import { jsonrepair } from 'jsonrepair';

export type JsonIndent = 2 | 4;

export type JsonRepairResult = {
  readonly json: string;
  readonly isRepaired: boolean;
};

const DELIMITER_REPLACEMENTS: Readonly<Record<string, string>> = {
  ';': ',',
  '\uFF0C': ',',
  '\uFF1A': ':',
  '\uFF1B': ',',
};

type DelimiterScannerState = 'code' | 'doubleQuote' | 'singleQuote' | 'lineComment' | 'blockComment';

function isDoubleQuoteLike(character: string): boolean {
  return character === '"' || character === '\u201C' || character === '\u201D';
}

function isSingleQuoteLike(character: string): boolean {
  return character === "'" || character === '\u2018' || character === '\u2019'
    || character === '`' || character === '\u00B4';
}

// jsonrepair does not treat some ASCII/fullwidth punctuation as structural delimiters. Replace only
// invalid punctuation outside strings and comments so punctuation in values is preserved.
function normalizeDelimiters(value: string): string {
  if (!Object.keys(DELIMITER_REPLACEMENTS).some((character) => value.includes(character))) {
    return value;
  }

  let normalized = '';
  let state: DelimiterScannerState = 'code';
  let escapeNext = false;
  let index = 0;

  while (index < value.length) {
    const character = value[index];
    const nextCharacter = value[index + 1] ?? '';

    if (state === 'lineComment') {
      normalized += character;

      if (character === '\n') {
        state = 'code';
      }
      index += 1;
      continue;
    }

    if (state === 'blockComment') {
      if (character === '*' && nextCharacter === '/') {
        normalized += '*/';
        state = 'code';
        index += 2;
      } else {
        normalized += character;
        index += 1;
      }
      continue;
    }

    if (state === 'doubleQuote' || state === 'singleQuote') {
      normalized += character;
      index += 1;

      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (character === '\\') {
        escapeNext = true;
        continue;
      }
      if (
        (state === 'doubleQuote' && isDoubleQuoteLike(character))
        || (state === 'singleQuote' && isSingleQuoteLike(character))
      ) {
        state = 'code';
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      normalized += '//';
      state = 'lineComment';
      index += 2;
      continue;
    }
    if (character === '/' && nextCharacter === '*') {
      normalized += '/*';
      state = 'blockComment';
      index += 2;
      continue;
    }

    const delimiter = DELIMITER_REPLACEMENTS[character];

    if (delimiter !== undefined) {
      normalized += delimiter;
    } else {
      normalized += character;

      if (isDoubleQuoteLike(character)) {
        state = 'doubleQuote';
      } else if (isSingleQuoteLike(character)) {
        state = 'singleQuote';
      }
    }
    index += 1;
  }

  return normalized;
}

// Normalize successful parses and repaired text through JSON.stringify to guarantee valid JSON output.
export function repairJson(value: string, indent: JsonIndent): JsonRepairResult {
  try {
    const parsed: unknown = JSON.parse(value);

    return { json: JSON.stringify(parsed, null, indent), isRepaired: false };
  } catch {
    const repaired = jsonrepair(normalizeDelimiters(value));
    const parsed: unknown = JSON.parse(repaired);

    return { json: JSON.stringify(parsed, null, indent), isRepaired: true };
  }
}
