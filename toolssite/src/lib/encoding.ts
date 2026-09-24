export type Base64Encoding = 'standard' | 'urlsafe';

type UrlParts = {
  readonly origin: string;
  readonly path: string;
  readonly query: string | null;
  readonly fragment: string | null;
};

function splitUrl(value: string): UrlParts {
  const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(value);
  let boundary = scheme?.[0].length ?? 0;

  // Keep scheme://userinfo@host:port (and protocol-relative //host:port)
  // unchanged; only path, query, and fragment components are encodable.
  if (value.startsWith('//', boundary)) {
    boundary += 2;

    while (
      boundary < value.length
      && value[boundary] !== '/'
      && value[boundary] !== '?'
      && value[boundary] !== '#'
    ) {
      boundary += 1;
    }
  }

  const origin = value.slice(0, boundary);
  const content = value.slice(boundary);
  const queryStart = content.indexOf('?');
  const beforeQuery = queryStart === -1 ? content : content.slice(0, queryStart);
  const afterQuery = queryStart === -1 ? null : content.slice(queryStart + 1);
  const fragmentStart = beforeQuery.indexOf('#');
  const path = fragmentStart === -1
    ? beforeQuery
    : beforeQuery.slice(0, fragmentStart);
  const fragment = queryStart === -1 && fragmentStart !== -1
    ? beforeQuery.slice(fragmentStart + 1)
    : null;

  return {
    origin,
    path,
    query: afterQuery,
    fragment,
  };
}

function encodePath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function decodePath(path: string): string {
  return path.split('/').map((segment) => decodeURIComponent(segment)).join('/');
}

function mapQueryComponents(
  query: string,
  mapComponent: (component: string) => string,
): string {
  return splitQueryParameters(query).map((parameter) => {
    const valueStart = parameter.indexOf('=');

    if (valueStart === -1) {
      return mapComponent(parameter);
    }

    return `${mapComponent(parameter.slice(0, valueStart))}=${
      mapComponent(parameter.slice(valueStart + 1))
    }`;
  }).join('&');
}

function splitQueryParameters(query: string): string[] {
  const chunks = query.split('&');
  const parameters: string[] = [];
  let current = chunks[0] ?? '';

  // Raw spaces and & make a pasted URL ambiguous. Treat & as a parameter
  // boundary only when it introduces another key=value parameter; this keeps
  // literal ampersands inside search phrases intact before encoding them.
  for (let index = 1; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    if (chunk.includes('=')) {
      parameters.push(current);
      current = chunk;
    } else {
      current += `&${chunk}`;
    }
  }

  parameters.push(current);

  return parameters;
}

// Query components use the form-urlencoded convention: a space is + while a
// literal + is %2B, so decoders can distinguish the two characters.
function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function decodeQueryComponent(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, '%20'));
}

export function encodeUrl(value: string): string {
  const parts = splitUrl(value);

  return parts.origin
    + encodePath(parts.path)
    + (parts.query === null ? '' : `?${mapQueryComponents(parts.query, encodeQueryComponent)}`)
    + (parts.fragment === null ? '' : `#${encodeURIComponent(parts.fragment)}`);
}

export function decodeUrl(value: string): string {
  const parts = splitUrl(value);

  return parts.origin
    + decodePath(parts.path)
    + (parts.query === null ? '' : `?${mapQueryComponents(parts.query, decodeQueryComponent)}`)
    + (parts.fragment === null ? '' : `#${decodeURIComponent(parts.fragment)}`);
}

export function encodeBase64(value: string, encoding: Base64Encoding = 'standard'): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const encoded = btoa(binary);

  // RFC 4648's URL-safe alphabet replaces + and /; padding remains valid.
  return encoding === 'urlsafe'
    ? encoded.replace(/\+/g, '-').replace(/\//g, '_')
    : encoded;
}

export function decodeBase64(value: string): string {
  // Decoding accepts both alphabets, including Base64 data pasted from other tools.
  const normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
