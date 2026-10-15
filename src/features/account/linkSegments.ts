export type LegalPage = 'terms' | 'privacy';
export type Segment = { text: string; link?: LegalPage };

const LINK = /<(terms|privacy)>(.*?)<\/\1>/g;

export function linkSegments(template: string): Segment[] {
  const segments: Segment[] = [];
  let from = 0;
  for (const match of template.matchAll(LINK)) {
    if (match.index > from) segments.push({ text: template.slice(from, match.index) });
    segments.push({ text: match[2], link: match[1] as LegalPage });
    from = match.index + match[0].length;
  }
  if (from < template.length) segments.push({ text: template.slice(from) });
  return segments;
}
