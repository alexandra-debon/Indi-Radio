import { describe, expect, it } from "vitest";
import { computeMentionInsertion } from "./insert-mention";

// Regression guard: mentions inserted from suggestions must never produce
// a "@@pseudo" sequence — neither on desktop (single '@' typed) nor on
// mobile (keyboard autocorrect can duplicate the '@').
describe("computeMentionInsertion", () => {
  it("desktop: inserts @pseudo after a single '@'", () => {
    // "Hello @al" with caret at end, tokenStart at index 6 ('@')
    const value = "Hello @al";
    const { next, pos } = computeMentionInsertion(value, 6, value.length, "alice");
    expect(next).toBe("Hello @alice ");
    expect(next).not.toMatch(/@@/);
    expect(pos).toBe("Hello @alice".length + 1);
  });

  it("desktop: inserts @pseudo when the token is only '@'", () => {
    const value = "Hey @";
    const { next } = computeMentionInsertion(value, 4, value.length, "bob");
    expect(next).toBe("Hey @bob ");
    expect(next).not.toMatch(/@@/);
  });

  it("mobile: swallows a duplicated leading '@' before the token", () => {
    // Mobile autocorrect produced "@@al"; detection latched onto the second '@'.
    const value = "Hey @@al";
    const tokenStart = 5; // second '@'
    const { next, pos } = computeMentionInsertion(value, tokenStart, value.length, "alice");
    expect(next).toBe("Hey @alice ");
    expect(next).not.toMatch(/@@/);
    expect(pos).toBe("Hey @alice".length + 1);
  });

  it("mobile: swallows several duplicated '@' before the token", () => {
    const value = "yo @@@@bo";
    const tokenStart = 6; // last '@' before 'bo'
    const { next } = computeMentionInsertion(value, tokenStart, value.length, "bob");
    expect(next).toBe("yo @bob ");
    expect(next).not.toMatch(/@@/);
  });

  it("preserves text after the caret and never introduces '@@' mid-string", () => {
    const value = "hi @@al world";
    const caret = 7; // right after "al"
    const tokenStart = 4; // second '@'
    const { next } = computeMentionInsertion(value, tokenStart, caret, "alice");
    expect(next).toBe("hi @alice  world");
    expect(next).not.toMatch(/@@/);
  });

  it("at the start of the input: '@@' collapses to '@pseudo'", () => {
    const value = "@@al";
    const { next } = computeMentionInsertion(value, 1, value.length, "alice");
    expect(next).toBe("@alice ");
    expect(next).not.toMatch(/@@/);
  });

  it("fuzz: no combination of leading '@' and pseudo produces '@@'", () => {
    const pseudos = ["a", "alice", "bob_42", "zoé", "x-y.z"];
    for (const pseudo of pseudos) {
      for (let ats = 1; ats <= 5; ats++) {
        const prefix = "text ";
        const value = prefix + "@".repeat(ats) + "al";
        const tokenStart = prefix.length + ats - 1; // last '@'
        const { next } = computeMentionInsertion(value, tokenStart, value.length, pseudo);
        expect(next, `pseudo=${pseudo} ats=${ats}`).not.toMatch(/@@/);
        expect(next.endsWith(`@${pseudo} `)).toBe(true);
      }
    }
  });
});