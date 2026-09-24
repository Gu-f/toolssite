export type ToolId =
  | 'base64'
  | 'url'
  | 'jwt'
  | 'json'
  | 'hash'
  | 'uuid'
  | 'regex'
  | 'color'
  | 'timestamp'
  | 'diff';

export type ToolCategory =
  | 'Encoding'
  | 'Format'
  | 'Crypto'
  | 'Generator'
  | 'Color'
  | 'Text'
  | 'Time';

export type Tool = {
  readonly id: ToolId;
  readonly label: string;
  readonly category: ToolCategory;
  readonly description: string;
};
