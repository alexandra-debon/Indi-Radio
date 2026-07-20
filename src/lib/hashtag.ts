// Normalize a hashtag before storage/display.
// - Strip leading '#'
// - Remove diacritics (é → e)
// - Lowercase
// - Replace whitespace and unsupported punctuation with '-'
// - Collapse consecutive separators, trim leading/trailing '-' '.' '_'
// - Return "" when nothing usable remains
export function normalizeHashtag(input: string): string {
  if (!input) return "";
  let s = input.trim().replace(/^#+/, "");
  // Decompose accents then drop combining marks
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.toLowerCase();
  // Replace any run of chars that aren't letters/digits/_/./- with a single '-'
  s = s.replace(/[^\p{L}\p{N}_.-]+/gu, "-");
  // Collapse repeats of separators
  s = s.replace(/-{2,}/g, "-").replace(/\.{2,}/g, ".").replace(/_{2,}/g, "_");
  // Trim leading/trailing separators
  s = s.replace(/^[-._]+|[-._]+$/g, "");
  return s;
}

export function isValidHashtag(input: string): boolean {
  return normalizeHashtag(input).length > 0;
}