import type { Base64Encoding } from '../../../lib/encoding';
import {
  createJwtHeaderText,
  isJwtAlgorithmOption,
  JWT_CUSTOM_ALGORITHM,
  type JwtAlgorithmOption,
} from '../../../lib/jwt';
import type { HashAlgorithm, HashResults } from '../../../lib/hash';
import { HASH_ALGORITHMS } from '../../../lib/hash';
import type {
  DifferenceLine,
  DifferenceLineType,
  DifferenceSegment,
  DifferenceSegmentType,
  DiffViewMode,
} from '../../../lib/difference';
import { getDefaultTimeZone, isTimeZone, type TimestampUnit } from '../../../lib/time';
import type { ToolId } from '../../../types/tool';

export type Base64ToolState = {
  readonly input: string;
  readonly output: string;
  readonly mode: 'encode' | 'decode';
  readonly encoding: Base64Encoding;
  readonly error: string;
};

export type UrlToolState = {
  readonly input: string;
  readonly output: string;
  readonly mode: 'encode' | 'decode';
  readonly error: string;
};

export type JwtToolState = {
  readonly mode: 'decode' | 'encode';
  readonly input: string;
  readonly headerText: string;
  readonly payloadText: string;
  readonly algorithm: JwtAlgorithmOption;
  readonly encodedToken: string;
  readonly error: string;
};

export type JsonToolState = {
  readonly input: string;
  readonly output: string;
  readonly status: '' | 'ok' | 'error' | 'repaired';
  readonly indent: 2 | 4;
};

export type HashToolState = {
  readonly mode: 'text' | 'file';
  readonly input: string;
  readonly textAlgorithms: readonly HashAlgorithm[];
  readonly fileAlgorithms: readonly HashAlgorithm[];
  readonly textResults: HashResults;
  readonly fileResults: HashResults;
  readonly error: string;
};

export type UuidToolState = {
  readonly count: number;
  readonly version: 'v4' | 'v7';
  readonly uuids: readonly string[];
};

export type RegexToolState = {
  readonly pattern: string;
  readonly flags: string;
  readonly text: string;
};

export type ColorToolState = {
  readonly hex: string;
  readonly alpha: number;
};

export type TimestampToolState = {
  readonly timestamp: string;
  readonly unit: TimestampUnit;
  readonly dateString: string;
  readonly timeZone: string;
  readonly error: string;
  readonly nowSeconds: number;
};

export type DiffToolState = {
  readonly original: string;
  readonly modified: string;
  readonly diff: readonly DifferenceLine[];
  readonly viewMode: DiffViewMode;
};

export type ToolStateMap = {
  base64: Base64ToolState;
  url: UrlToolState;
  jwt: JwtToolState;
  json: JsonToolState;
  hash: HashToolState;
  uuid: UuidToolState;
  regex: RegexToolState;
  color: ColorToolState;
  timestamp: TimestampToolState;
  diff: DiffToolState;
};

export type ToolStateName = keyof ToolStateMap;
export type AnyToolState = ToolStateMap[ToolStateName];

export type ToolStateDefinition<TName extends ToolStateName = ToolStateName> = {
  readonly toolId: ToolId;
  readonly defaultValue: ToolStateMap[TName];
  readonly validate: (value: unknown) => ToolStateMap[TName] | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
}

function isEncodedMode(value: unknown): value is 'encode' | 'decode' {
  return value === 'encode' || value === 'decode';
}

function isJwtMode(value: unknown): value is JwtToolState['mode'] {
  return value === 'decode' || value === 'encode';
}

function isUuidVersion(value: unknown): value is 'v4' | 'v7' {
  return value === 'v4' || value === 'v7';
}

function isDifferenceLineType(value: unknown): value is DifferenceLineType {
  return value === 'same' || value === 'add' || value === 'remove';
}

function isDifferenceSegmentType(value: unknown): value is DifferenceSegmentType {
  return value === 'same' || value === 'add' || value === 'remove';
}

function isBase64Encoding(value: unknown): value is Base64Encoding {
  return value === 'standard' || value === 'urlsafe';
}

function isTimestampUnit(value: unknown): value is TimestampUnit {
  return value === 'seconds' || value === 'milliseconds';
}

function isDifferenceSegment(value: unknown): value is DifferenceSegment {
  return isRecord(value) && isDifferenceSegmentType(value.type) && isString(value.text);
}

function defineToolState<TName extends ToolStateName>(
  toolId: TName,
  defaultValue: ToolStateMap[TName],
  validate: (value: unknown) => ToolStateMap[TName] | null,
): ToolStateDefinition<TName> {
  return { toolId, defaultValue, validate };
}

function validateBase64State(value: unknown): Base64ToolState | null {
  if (!isRecord(value) || !isEncodedMode(value.mode) || !isString(value.input)
    || !isString(value.output) || !isString(value.error)) {
    return null;
  }

  return {
    input: value.input,
    output: value.output,
    mode: value.mode,
    encoding: isBase64Encoding(value.encoding) ? value.encoding : 'standard',
    error: value.error,
  };
}

function isDifferenceLine(value: unknown): value is DifferenceLine {
  if (!isRecord(value) || !isDifferenceLineType(value.type) || !isString(value.text)) {
    return false;
  }

  if (value.segments === undefined) {
    return true;
  }

  const changeType = value.type === 'add'
    ? 'add'
    : value.type === 'remove'
      ? 'remove'
      : null;

  return Array.isArray(value.segments) && value.segments.every((segment) => {
    if (!isDifferenceSegment(segment)) {
      return false;
    }

    return segment.type === 'same' || (changeType !== null && segment.type === changeType);
  });
}

function isHashResults(value: unknown): value is HashResults {
  return isRecord(value) && isString(value['SHA-256']) && isString(value['SHA-1'])
    && isString(value.MD5);
}

function isHashSource(value: unknown): value is HashToolState['mode'] {
  return value === 'text' || value === 'file';
}

function isHashAlgorithms(value: unknown): value is readonly HashAlgorithm[] {
  return Array.isArray(value) && value.every((algorithm) =>
    HASH_ALGORITHMS.includes(algorithm as HashAlgorithm));
}

function createEmptyHashResults(): HashResults {
  return { 'SHA-256': '', 'SHA-1': '', MD5: '' };
}

function validateJsonIndent(value: unknown): value is 2 | 4 {
  return value === 2 || value === 4;
}

export const TOOL_STATE_DEFINITIONS = {
  base64: defineToolState(
    'base64',
    { input: '', output: '', mode: 'encode', encoding: 'standard', error: '' },
    validateBase64State,
  ),
  url: defineToolState(
    'url',
    { input: '', output: '', mode: 'encode', error: '' },
    (value) => {
      if (!isRecord(value) || !isEncodedMode(value.mode) || !isString(value.input)
        || !isString(value.output) || !isString(value.error)) {
        return null;
      }

      return {
        input: value.input,
        output: value.output,
        mode: value.mode,
        error: value.error,
      };
    },
  ),
  jwt: defineToolState(
    'jwt',
    {
      mode: 'decode',
      input: '',
      headerText: createJwtHeaderText('HS256'),
      payloadText: '{}',
      algorithm: 'HS256',
      encodedToken: '',
      error: '',
    },
    (value) => {
      if (!isRecord(value) || !isString(value.input) || !isString(value.error)) {
        return null;
      }

      const algorithm = isJwtAlgorithmOption(value.algorithm) ? value.algorithm : 'HS256';

      const defaultHeaderText = createJwtHeaderText(
        algorithm === JWT_CUSTOM_ALGORITHM ? 'HS256' : algorithm,
      );
      const headerText = isString(value.headerText) ? value.headerText : defaultHeaderText;

      return {
        mode: isJwtMode(value.mode) ? value.mode : 'decode',
        input: value.input,
        headerText: headerText.trim() === '{}' ? defaultHeaderText : headerText,
        payloadText: isString(value.payloadText) ? value.payloadText : '{}',
        algorithm,
        encodedToken: isString(value.encodedToken) ? value.encodedToken : '',
        error: value.error,
      };
    },
  ),
  json: defineToolState(
    'json',
    { input: '', output: '', status: '', indent: 2 },
    (value) => {
      if (!isRecord(value) || !isString(value.input) || !isString(value.output)
        || !isString(value.status) || !validateJsonIndent(value.indent)
        || (value.status !== '' && value.status !== 'ok' && value.status !== 'error'
          && value.status !== 'repaired')) {
        return null;
      }

      return {
        input: value.input,
        output: value.output,
        status: value.status === 'ok'
          ? 'ok'
          : value.status === 'repaired'
            ? 'repaired'
            : value.status === 'error'
              ? 'error'
              : '',
        indent: value.indent,
      };
    },
  ),
  hash: defineToolState(
    'hash',
    {
      mode: 'text',
      input: '',
      textAlgorithms: HASH_ALGORITHMS,
      fileAlgorithms: ['MD5'],
      textResults: createEmptyHashResults(),
      fileResults: createEmptyHashResults(),
      error: '',
    },
    (value) => {
      if (!isRecord(value) || !isString(value.input) || !isString(value.error)) {
        return null;
      }

      const mode = isHashSource(value.mode) ? value.mode : 'text';
      const textAlgorithms = isHashAlgorithms(value.textAlgorithms)
        ? value.textAlgorithms
        : HASH_ALGORITHMS;
      const fileAlgorithms: readonly HashAlgorithm[] = isHashAlgorithms(value.fileAlgorithms)
        ? value.fileAlgorithms
        : ['MD5'];
      const legacyResults = isHashResults(value.results)
        ? value.results
        : createEmptyHashResults();

      return {
        mode,
        input: value.input,
        textAlgorithms,
        fileAlgorithms,
        // States saved before file hashing existed contain only text results.
        textResults: isHashResults(value.textResults) ? value.textResults : legacyResults,
        fileResults: isHashResults(value.fileResults) ? value.fileResults : createEmptyHashResults(),
        error: value.error,
      };
    },
  ),
  uuid: defineToolState(
    'uuid',
    { count: 5, version: 'v4', uuids: [] },
    (value) => {
      if (!isRecord(value) || !isFiniteNumber(value.count) || !isUuidVersion(value.version)
        || !isStringArray(value.uuids)) {
        return null;
      }

      return {
        count: [1, 5, 10, 20].includes(value.count) ? value.count : 5,
        version: value.version,
        uuids: value.uuids,
      };
    },
  ),
  regex: defineToolState(
    'regex',
    { pattern: '', flags: 'g', text: '' },
    (value) => {
      if (!isRecord(value) || !isString(value.pattern) || !isString(value.flags)
        || !isString(value.text)) {
        return null;
      }

      return { pattern: value.pattern, flags: value.flags, text: value.text };
    },
  ),
  color: defineToolState(
    'color',
    { hex: '#00d4ff', alpha: 1 },
    (value) => {
      if (!isRecord(value) || !isString(value.hex)) {
        return null;
      }

      // States saved before the alpha preview existed only contain `hex`.
      const alpha = value.alpha === undefined ? 1 : value.alpha;

      if (!isFiniteNumber(alpha) || alpha < 0 || alpha > 1) {
        return null;
      }

      return { hex: value.hex, alpha };
    },
  ),
  timestamp: defineToolState(
    'timestamp',
    {
      timestamp: String(Math.floor(Date.now() / 1000)),
      unit: 'seconds',
      dateString: '',
      timeZone: getDefaultTimeZone(),
      error: '',
      nowSeconds: Math.floor(Date.now() / 1000),
    },
    (value) => {
      if (!isRecord(value) || !isString(value.timestamp) || !isString(value.dateString)
        || !isString(value.error) || !isFiniteNumber(value.nowSeconds)) {
        return null;
      }

      const unit = value.unit === undefined ? 'seconds' : value.unit;
      const rawTimeZone: unknown = value.timeZone;
      const timeZone = rawTimeZone === undefined ? getDefaultTimeZone() : rawTimeZone;

      if (!isTimestampUnit(unit) || !isString(timeZone) || !isTimeZone(timeZone)) {
        return null;
      }

      return {
        timestamp: value.timestamp,
        unit,
        dateString: value.dateString,
        timeZone,
        error: value.error,
        nowSeconds: value.nowSeconds,
      };
    },
  ),
  diff: defineToolState(
    'diff',
    { original: '', modified: '', diff: [], viewMode: 'unified' },
    (value) => {
      if (!isRecord(value) || !isString(value.original) || !isString(value.modified)
        || !Array.isArray(value.diff) || !value.diff.every(isDifferenceLine)) {
        return null;
      }

      return {
        original: value.original,
        modified: value.modified,
        diff: value.diff,
        // Existing persisted state predates the split view; keep it readable.
        viewMode: value.viewMode === 'split' ? 'split' : 'unified',
      };
    },
  ),
} as const satisfies Record<ToolStateName, ToolStateDefinition<ToolStateName>>;
