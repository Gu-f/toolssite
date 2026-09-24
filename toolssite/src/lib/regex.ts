export type RegexMatch = {
  readonly value: string;
  readonly index: number;
};

export type RegexResult = {
  readonly matches: readonly RegexMatch[];
  readonly error: string | null;
};

// A hard limit keeps a broad expression from allocating enough matches to
// block the main thread when users paste very large text.
export const MAX_REGEX_MATCHES = 1000;

function hasDuplicateFlags(flags: string): boolean {
  return new Set(flags).size !== flags.length;
}

function hasInvalidFlags(flags: string): boolean {
  return /[^dgimsuvy]/u.test(flags);
}

export function findRegexMatches(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern || !text) {
    return { matches: [], error: null };
  }

  if (hasDuplicateFlags(flags) || hasInvalidFlags(flags)) {
    return { matches: [], error: 'Invalid regular expression flags' };
  }

  try {
    const expression = new RegExp(pattern, flags);
    const matches: RegexMatch[] = [];
    const isGlobal = expression.global;

    while (matches.length < MAX_REGEX_MATCHES) {
      const match = expression.exec(text);
      if (!match) break;
      matches.push({ value: match[0], index: match.index });
      if (match[0].length === 0) {
        expression.lastIndex += 1;
      }
      if (!isGlobal) break;
    }

    return { matches, error: null };
  } catch {
    return { matches: [], error: 'Invalid regular expression' };
  }
}
