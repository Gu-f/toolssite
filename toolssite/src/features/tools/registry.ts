import type { Tool, ToolCategory, ToolId } from '../../types/tool';

export const TOOLS: readonly Tool[] = [
  {
    id: 'base64',
    label: 'Base64',
    category: 'Encoding',
    description: 'Encode / decode Base64 strings',
  },
  {
    id: 'url',
    label: 'URL Encode',
    category: 'Encoding',
    description: 'Encode / decode URI components',
  },
  {
    id: 'jwt',
    label: 'JWT Debugger',
    category: 'Encoding',
    description: 'Decode, encode, and verify JWT signatures',
  },
  {
    id: 'json',
    label: 'JSON Formatter',
    category: 'Format',
    description: 'Pretty-print and validate JSON',
  },
  {
    id: 'hash',
    label: 'Hash Generator',
    category: 'Generator',
    description: 'SHA-256 / SHA-1 / MD5 hashes',
  },
  {
    id: 'uuid',
    label: 'UUID Generator',
    category: 'Generator',
    description: 'Generate UUIDs v4 and v7',
  },
  {
    id: 'regex',
    label: 'Regex Tester',
    category: 'Text',
    description: 'Test and highlight regex matches',
  },
  {
    id: 'color',
    label: 'Color Converter',
    category: 'Color',
    description: 'HEX ↔ RGB ↔ HSL conversion',
  },
  {
    id: 'timestamp',
    label: 'Timestamp',
    category: 'Time',
    description: 'Unix timestamp ↔ human date',
  },
  {
    id: 'diff',
    label: 'Text Diff',
    category: 'Text',
    description: 'Line-by-line text comparison',
  },
] as const;

export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  ...new Set(TOOLS.map((tool) => tool.category)),
];

export const DEFAULT_TOOL_ID: ToolId = 'base64';

export function isToolId(value: string | null): value is ToolId {
  return TOOLS.some((tool) => tool.id === value);
}
