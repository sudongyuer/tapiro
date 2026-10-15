export type LegalPage = 'terms' | 'privacy';
export type Segment = { text: string; link?: LegalPage };

const LINK = /<(terms|privacy)>([\s\S]*?)<\/\1>/g;
const STRAY_TAG = /<\/?(?:terms|privacy)>/g;

function plain(text: string): Segment[] {
  const stripped = text.replace(STRAY_TAG, '');
  return stripped ? [{ text: stripped }] : [];
}

export function linkSegments(template: string): Segment[] {
  const segments: Segment[] = [];
  let from = 0;
  for (const match of template.matchAll(LINK)) {
    segments.push(...plain(template.slice(from, match.index)));
    segments.push({ text: match[2], link: match[1] as LegalPage });
    from = match.index + match[0].length;
  }
  segments.push(...plain(template.slice(from)));
  return segments;
}
