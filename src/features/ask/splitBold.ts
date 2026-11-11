export function splitBold(text: string) {
  const match = /^(.*?)<b>(.*?)<\/b>(.*)$/s.exec(text);
  return match ? { before: match[1], bold: match[2], after: match[3] } : null;
}
