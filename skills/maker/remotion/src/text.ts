/** Rich inline text — the signature of this look.
 *
 *  The reference does NOT stack one weight per line. It writes a sentence that wraps
 *  naturally and emphasises words *inside* it:
 *
 *      every **AI assistant** you have ever used **works** this way
 *
 *  Plain words are medium-weight and muted; emphasised words are black and near-black.
 *  Reading only the bold words still gives the sentence — that is the test.
 */

export type Emphasis = "plain" | "bold" | "accent" | "mark";

export type Token = { text: string; em: Emphasis };

const MARKERS: [RegExp, Emphasis][] = [
  [/\*\*([^*]+)\*\*/g, "bold"],
  [/__([^_]+)__/g, "accent"],
  [/==([^=]+)==/g, "mark"],
];

/** Split a marked-up string into words, each carrying its emphasis. */
export const parse = (input: string): Token[] => {
  type Span = { text: string; em: Emphasis };
  let spans: Span[] = [{ text: input, em: "plain" }];

  for (const [re, em] of MARKERS) {
    const next: Span[] = [];
    for (const span of spans) {
      if (span.em !== "plain") {
        next.push(span);
        continue;
      }
      let last = 0;
      const source = span.text;
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        if (m.index > last) next.push({ text: source.slice(last, m.index), em: "plain" });
        next.push({ text: m[1], em });
        last = m.index + m[0].length;
      }
      if (last < source.length) next.push({ text: source.slice(last), em: "plain" });
    }
    spans = next;
  }

  const tokens: Token[] = [];
  for (const span of spans) {
    for (const word of span.text.split(/\s+/)) {
      if (word) tokens.push({ text: word, em: span.em });
    }
  }
  return tokens;
};

/** True when the string carries no markers — lets callers keep the old Line API. */
export const isPlain = (s: string) => !/\*\*|__|==/.test(s);
