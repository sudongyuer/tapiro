export type Tlv = Map<string, string>;

export function crc16(text: string) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
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
  const match = payload.match(/^(.*6304)([0-9A-Fa-f]{4})$/s);
  return match !== null && crc16(match[1]) === match[2].toUpperCase();
}

export function parseTlv(text: string): Tlv | null {
  const fields: Tlv = new Map();
  let at = 0;
  while (at < text.length) {
    const id = text.slice(at, at + 2);
    const length = Number(text.slice(at + 2, at + 4));
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(text.slice(at + 2, at + 4))) return null;
    const value = text.slice(at + 4, at + 4 + length);
    if (value.length !== length) return null;
    fields.set(id, value);
    at += 4 + length;
  }
  return fields;
}

export function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}
