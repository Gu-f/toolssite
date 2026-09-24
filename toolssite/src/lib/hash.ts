export const HASH_ALGORITHMS = ['SHA-256', 'SHA-1', 'MD5'] as const;

export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export type HashResults = Record<HashAlgorithm, string>;

type HashBytes = Uint8Array<ArrayBuffer>;
const encoder = new TextEncoder();

function toBytes(value: string | HashBytes): HashBytes {
  return typeof value === 'string' ? encoder.encode(value) : value;
}

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function digestWithSubtle(
  algorithm: 'SHA-1' | 'SHA-256',
  value: string | HashBytes,
): Promise<string> {
  const bytes = await crypto.subtle.digest(algorithm, toBytes(value));

  return toHex(bytes);
}

export function calculateSha256(value: string | HashBytes): Promise<string> {
  return digestWithSubtle('SHA-256', value);
}

export function calculateSha1(value: string | HashBytes): Promise<string> {
  return digestWithSubtle('SHA-1', value);
}

// MD5 is retained because it is commonly required by legacy integrations.
export function calculateMd5(value: string | HashBytes): string {
  return calculateMd5FromBytes(toBytes(value));
}

function calculateMd5FromBytes(bytes: Uint8Array): string {
  const safeAdd = (left: number, right: number): number => {
    const low = (left & 0xffff) + (right & 0xffff);
    return (((left >> 16) + (right >> 16) + (low >> 16)) << 16) | (low & 0xffff);
  };
  const rotateLeft = (number_: number, amount: number): number =>
    (number_ << amount) | (number_ >>> (32 - amount));
  const round = (
    result: number,
    left: number,
    addend: number,
    input: number,
    amount: number,
    constant: number,
  ): number => safeAdd(rotateLeft(safeAdd(safeAdd(left, result), safeAdd(input, constant)), amount), addend);
  const roundF = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number =>
    round((b & c) | (~b & d), a, b, x, s, t);
  const roundG = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number =>
    round((b & d) | (c & ~d), a, b, x, s, t);
  const roundH = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number =>
    round(b ^ c ^ d, a, b, x, s, t);
  const roundI = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number =>
    round(c ^ (b | ~d), a, b, x, s, t);

  const bitLength = bytes.length * 8;
  const paddedLength = (Math.floor(bytes.length / 64) + (bytes.length % 64 < 56 ? 1 : 2)) * 64;
  const paddedBytes = new Uint8Array(paddedLength);
  const paddedView = new DataView(paddedBytes.buffer);

  paddedBytes.set(bytes);
  paddedBytes[bytes.length] = 0x80;
  paddedView.setUint32(paddedLength - 8, bitLength % 0x100000000, true);
  paddedView.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const originalA = a;
    const originalB = b;
    const originalC = c;
    const originalD = d;
    const block = new Uint32Array(16);

    for (let wordIndex = 0; wordIndex < block.length; wordIndex += 1) {
      block[wordIndex] = paddedView.getUint32(offset + wordIndex * 4, true);
    }

    a = roundF(a, b, c, d, block[0], 7, -680876936);
    d = roundF(d, a, b, c, block[1], 12, -389564586);
    c = roundF(c, d, a, b, block[2], 17, 606105819);
    b = roundF(b, c, d, a, block[3], 22, -1044525330);
    a = roundF(a, b, c, d, block[4], 7, -176418897);
    d = roundF(d, a, b, c, block[5], 12, 1200080426);
    c = roundF(c, d, a, b, block[6], 17, -1473231341);
    b = roundF(b, c, d, a, block[7], 22, -45705983);
    a = roundF(a, b, c, d, block[8], 7, 1770035416);
    d = roundF(d, a, b, c, block[9], 12, -1958414417);
    c = roundF(c, d, a, b, block[10], 17, -42063);
    b = roundF(b, c, d, a, block[11], 22, -1990404162);
    a = roundF(a, b, c, d, block[12], 7, 1804603682);
    d = roundF(d, a, b, c, block[13], 12, -40341101);
    c = roundF(c, d, a, b, block[14], 17, -1502002290);
    b = roundF(b, c, d, a, block[15], 22, 1236535329);

    a = roundG(a, b, c, d, block[1], 5, -165796510);
    d = roundG(d, a, b, c, block[6], 9, -1069501632);
    c = roundG(c, d, a, b, block[11], 14, 643717713);
    b = roundG(b, c, d, a, block[0], 20, -373897302);
    a = roundG(a, b, c, d, block[5], 5, -701558691);
    d = roundG(d, a, b, c, block[10], 9, 38016083);
    c = roundG(c, d, a, b, block[15], 14, -660478335);
    b = roundG(b, c, d, a, block[4], 20, -405537848);
    a = roundG(a, b, c, d, block[9], 5, 568446438);
    d = roundG(d, a, b, c, block[14], 9, -1019803690);
    c = roundG(c, d, a, b, block[3], 14, -187363961);
    b = roundG(b, c, d, a, block[8], 20, 1163531501);
    a = roundG(a, b, c, d, block[13], 5, -1444681467);
    d = roundG(d, a, b, c, block[2], 9, -51403784);
    c = roundG(c, d, a, b, block[7], 14, 1735328473);
    b = roundG(b, c, d, a, block[12], 20, -1926607734);

    a = roundH(a, b, c, d, block[5], 4, -378558);
    d = roundH(d, a, b, c, block[8], 11, -2022574463);
    c = roundH(c, d, a, b, block[11], 16, 1839030562);
    b = roundH(b, c, d, a, block[14], 23, -35309556);
    a = roundH(a, b, c, d, block[1], 4, -1530992060);
    d = roundH(d, a, b, c, block[4], 11, 1272893353);
    c = roundH(c, d, a, b, block[7], 16, -155497632);
    b = roundH(b, c, d, a, block[10], 23, -1094730640);
    a = roundH(a, b, c, d, block[13], 4, 681279174);
    d = roundH(d, a, b, c, block[0], 11, -358537222);
    c = roundH(c, d, a, b, block[3], 16, -722521979);
    b = roundH(b, c, d, a, block[6], 23, 76029189);
    a = roundH(a, b, c, d, block[9], 4, -640364487);
    d = roundH(d, a, b, c, block[12], 11, -421815835);
    c = roundH(c, d, a, b, block[15], 16, 530742520);
    b = roundH(b, c, d, a, block[2], 23, -995338651);

    a = roundI(a, b, c, d, block[0], 6, -198630844);
    d = roundI(d, a, b, c, block[7], 10, 1126891415);
    c = roundI(c, d, a, b, block[14], 15, -1416354905);
    b = roundI(b, c, d, a, block[5], 21, -57434055);
    a = roundI(a, b, c, d, block[12], 6, 1700485571);
    d = roundI(d, a, b, c, block[3], 10, -1894986606);
    c = roundI(c, d, a, b, block[10], 15, -1051523);
    b = roundI(b, c, d, a, block[1], 21, -2054922799);
    a = roundI(a, b, c, d, block[8], 6, 1873313359);
    d = roundI(d, a, b, c, block[15], 10, -30611744);
    c = roundI(c, d, a, b, block[6], 15, -1560198380);
    b = roundI(b, c, d, a, block[13], 21, 1309151649);
    a = roundI(a, b, c, d, block[4], 6, -145523070);
    d = roundI(d, a, b, c, block[11], 10, -1120210379);
    c = roundI(c, d, a, b, block[2], 15, 718787259);
    b = roundI(b, c, d, a, block[9], 21, -343485551);

    a = safeAdd(a, originalA);
    b = safeAdd(b, originalB);
    c = safeAdd(c, originalC);
    d = safeAdd(d, originalD);
  }

  return [a, b, c, d]
    .map((number_) => (number_ < 0 ? number_ + 4294967296 : number_).toString(16).padStart(8, '0'))
    .map((word) => word.match(/../g)?.reverse().join('') ?? '')
    .join('');
}
