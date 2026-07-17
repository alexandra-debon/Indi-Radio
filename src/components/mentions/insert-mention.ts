// Pure helper for inserting an @mention into a textarea value.
// Extracted so it can be unit-tested without a DOM.
//
// Given the current textarea `value`, the position of the '@' that started
// the current mention token (`tokenStart`), the current caret position
// (`caret`), and the chosen `pseudo`, returns the next textarea value and
// the new caret position.
//
// Key guarantee: the resulting text never contains "@@pseudo". Some mobile
// keyboards autocorrect and produce a stray "@" just before the mention
// token; we swallow every consecutive '@' immediately preceding
// `tokenStart` before writing the mention.
export function computeMentionInsertion(
  value: string,
  tokenStart: number,
  caret: number,
  pseudo: string,
): { next: string; pos: number } {
  let start = tokenStart;
  while (start > 0 && value[start - 1] === "@") start -= 1;
  const next = value.slice(0, start) + "@" + pseudo + " " + value.slice(caret);
  const pos = start + pseudo.length + 2;
  return { next, pos };
}