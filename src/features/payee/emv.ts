export type Tlv = Map<string, string>;

const utf8 = new TextEncoder();

// Lengths count characters (HKMA Common QR Code Specification §2, profiling EMV QRCPS MPM:
// "a length field that explicitly indicates the number of characters"); DuitNow tag 64 values are
// Unicode strings. The CRC covers the payload as encoded in the QR symbol, i.e. its UTF-8 bytes.
const chars = (text: string) => Array.from(text);

export function crc16(text: string) {
  let crc = 0xffff;
  for (const byte of utf8.encode(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function withCrc(body: string) {
  const unsigned = `${body}6304`;
  return unsigned + crc16(unsigned);
}

export function hasValidCrc(payload: string) {
  const match = payload.match(/^(.*6304)([0-9A-Fa-f]{4})$/su);
  return match !== null && crc16(match[1]) === match[2].toUpperCase();
}

export function parseTlv(text: string): Tlv | null {
  const units = chars(text);
  const fields: Tlv = new Map();
  let at = 0;
  while (at < units.length) {
    const id = units.slice(at, at + 2).join('');
    const rawLength = units.slice(at + 2, at + 4).join('');
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(rawLength)) return null;
    const length = Number(rawLength);
    const value = units.slice(at + 4, at + 4 + length);
    if (value.length !== length) return null;
    fields.set(id, value.join(''));
    at += 4 + length;
  }
  return fields;
}

export function tlv(id: string, value: string) {
  return `${id}${String(chars(value).length).padStart(2, '0')}${value}`;
}
