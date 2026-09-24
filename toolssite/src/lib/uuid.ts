export function generateUuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidV7(): string {
  const timestamp = BigInt(Date.now());
  const random = crypto.getRandomValues(new Uint8Array(10));
  const high = (timestamp << 16n) | ((BigInt(random[0]) & 0x0fffn) | 0x7000n);
  const low =
    ((BigInt(random[1]) & 0x3fn) | 0x80n) << 56n |
    (BigInt(random[2]) << 48n) |
    (BigInt(random[3]) << 40n) |
    (BigInt(random[4]) << 32n) |
    (BigInt(random[5]) << 24n) |
    (BigInt(random[6]) << 16n) |
    (BigInt(random[7]) << 8n) |
    BigInt(random[8]);
  const hex = high.toString(16).padStart(16, '0') + low.toString(16).padStart(16, '0');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
