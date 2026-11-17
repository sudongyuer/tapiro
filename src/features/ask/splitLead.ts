const SENTENCE_END = /[。！？]|[.!?](?=\s)/u;

export function splitLead(text: string): { lead: string; rest: string } {
  const end = SENTENCE_END.exec(text);
  if (!end) return { lead: text, rest: '' };
  const cut = end.index + end[0].length;
  return { lead: text.slice(0, cut), rest: text.slice(cut).trim() };
}
