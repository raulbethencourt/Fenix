import { describe, it, expect } from "vitest";
import {
  parseMarkdownHeading,
  getFindingsSectionBounds,
  isLikelyFindingLine,
  normalizeVerdictValue,
  isNeedsAttentionVerdictValue,
  hasNeedsAttentionVerdict,
} from "../extensions/review.ts";

describe("parseMarkdownHeading", () => {
  it("parses h1", () => {
    const result = parseMarkdownHeading("# Title");
    expect(result).toEqual({ level: 1, title: "Title" });
  });
  it("parses h3", () => {
    const result = parseMarkdownHeading("### My Section");
    expect(result).toEqual({ level: 3, title: "My Section" });
  });
  it("strips trailing hashes", () => {
    const result = parseMarkdownHeading("## Title ##");
    expect(result).toEqual({ level: 2, title: "Title" });
  });
  it("returns null for non-headings", () => {
    expect(parseMarkdownHeading("just text")).toBeNull();
    expect(parseMarkdownHeading("")).toBeNull();
    expect(parseMarkdownHeading("- list item")).toBeNull();
  });
});

describe("getFindingsSectionBounds", () => {
  it("finds findings section", () => {
    const lines = [
      "# Review",
      "## Findings",
      "- [P1] Bug found",
      "- [P2] Style issue",
      "## Verdict",
      "All good",
    ];
    const bounds = getFindingsSectionBounds(lines);
    expect(bounds).not.toBeNull();
    expect(bounds!.start).toBe(2);
    expect(bounds!.end).toBe(4);
  });
  it("returns null when no findings", () => {
    const lines = ["# Review", "## Verdict", "All good"];
    expect(getFindingsSectionBounds(lines)).toBeNull();
  });
  it("handles findings at end of document", () => {
    const lines = ["## Findings", "- [P1] Bug", "- [P2] Issue"];
    const bounds = getFindingsSectionBounds(lines);
    expect(bounds).not.toBeNull();
    expect(bounds!.end).toBe(3);
  });
});

describe("isLikelyFindingLine", () => {
  it("identifies finding lines with priority tags", () => {
    expect(isLikelyFindingLine("- [P1] Critical bug in auth")).toBe(true);
    expect(isLikelyFindingLine("* [P2] Missing null check")).toBe(true);
    expect(isLikelyFindingLine("### [P0] Security vulnerability")).toBe(true);
  });
  it("rejects lines without priority tags", () => {
    expect(isLikelyFindingLine("- Regular list item")).toBe(false);
    expect(isLikelyFindingLine("Just text")).toBe(false);
  });
  it("rejects legend/rubric lines", () => {
    expect(isLikelyFindingLine("- [P0] - drop everything")).toBe(false);
    expect(isLikelyFindingLine("- [P1] - urgent")).toBe(false);
  });
  it("rejects lines with multiple priority tags", () => {
    expect(isLikelyFindingLine("- [P0] and [P1] tags")).toBe(false);
  });
});

describe("normalizeVerdictValue", () => {
  it("normalizes basic values", () => {
    expect(normalizeVerdictValue("  PASS  ")).toBe("pass");
    expect(normalizeVerdictValue("Needs Attention")).toBe("needs attention");
  });
  it("strips leading list markers", () => {
    expect(normalizeVerdictValue("- Pass")).toBe("pass");
    expect(normalizeVerdictValue("* Fail")).toBe("fail");
  });
  it("strips quotes", () => {
    expect(normalizeVerdictValue('"Pass"')).toBe("pass");
  });
});

describe("isNeedsAttentionVerdictValue", () => {
  it("returns true for needs attention", () => {
    expect(isNeedsAttentionVerdictValue("Needs Attention")).toBe(true);
    expect(isNeedsAttentionVerdictValue("needs attention")).toBe(true);
  });
  it("returns false for pass", () => {
    expect(isNeedsAttentionVerdictValue("Pass")).toBe(false);
  });
  it("returns false for 'not needs attention'", () => {
    expect(isNeedsAttentionVerdictValue("not needs attention")).toBe(false);
  });
  it("returns false for rubric phrasing", () => {
    expect(isNeedsAttentionVerdictValue("correct or needs attention")).toBe(false);
  });
});

describe("hasNeedsAttentionVerdict", () => {
  it("finds inline verdict", () => {
    expect(hasNeedsAttentionVerdict("Verdict: Needs Attention")).toBe(true);
    expect(hasNeedsAttentionVerdict("Overall Verdict: Needs Attention")).toBe(true);
  });
  it("finds heading-based verdict", () => {
    const text = "## Verdict\n\nNeeds Attention";
    expect(hasNeedsAttentionVerdict(text)).toBe(true);
  });
  it("returns false for pass verdict", () => {
    expect(hasNeedsAttentionVerdict("Verdict: Pass")).toBe(false);
  });
  it("returns false for no verdict", () => {
    expect(hasNeedsAttentionVerdict("Some random text")).toBe(false);
  });
});
