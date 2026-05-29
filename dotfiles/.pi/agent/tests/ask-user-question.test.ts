import { describe, it, expect } from "vitest";
import {
  normalizeOptions,
  getOtherLabel,
  formatAnswerForModel,
  answerSortRank,
  sortAnswers,
  buildResult,
  cancelledResult,
  unavailableResult,
} from "../extensions/ask-user-question.ts";

describe("normalizeOptions", () => {
  it("normalizes option labels and values", () => {
    const result = normalizeOptions([{ label: " Option 1 ", value: " val1 " }]);
    expect(result).toEqual([{ label: "Option 1", value: "val1", description: undefined }]);
  });
  it("defaults value to label", () => {
    const result = normalizeOptions([{ label: "Option" }]);
    expect(result[0].value).toBe("Option");
  });
  it("filters empty labels", () => {
    const result = normalizeOptions([{ label: "" }, { label: "Valid" }]);
    expect(result.length).toBe(1);
    expect(result[0].label).toBe("Valid");
  });
  it("handles undefined options", () => {
    expect(normalizeOptions(undefined)).toEqual([]);
  });
});

describe("getOtherLabel", () => {
  it("returns 'Other' when no conflict", () => {
    expect(getOtherLabel([{ label: "A", value: "a" }])).toBe("Other");
  });
  it("returns 'Other (custom)' when 'other' exists", () => {
    expect(getOtherLabel([{ label: "Other", value: "other" }])).toBe("Other (custom)");
    expect(getOtherLabel([{ label: "other", value: "x" }])).toBe("Other (custom)");
  });
});

describe("formatAnswerForModel", () => {
  it("formats text answer", () => {
    expect(formatAnswerForModel({ type: "text", label: "my answer", value: "my answer" })).toBe("my answer");
  });
  it("formats option answer", () => {
    expect(formatAnswerForModel({ type: "option", label: "Choice A", value: "a", index: 1 })).toBe("1. Choice A");
  });
  it("formats other answer", () => {
    expect(formatAnswerForModel({ type: "other", label: "custom text", value: "custom text" })).toBe("Other: custom text");
  });
});

describe("answerSortRank", () => {
  it("sorts options by index", () => {
    expect(answerSortRank({ type: "option", label: "A", value: "a", index: 2 })).toBe(2);
  });
  it("puts other before text", () => {
    const otherRank = answerSortRank({ type: "other", label: "x", value: "x" });
    const textRank = answerSortRank({ type: "text", label: "x", value: "x" });
    expect(otherRank).toBeLessThan(textRank);
  });
});

describe("sortAnswers", () => {
  it("sorts by rank", () => {
    const answers = [
      { type: "other" as const, label: "custom", value: "custom" },
      { type: "option" as const, label: "B", value: "b", index: 2 },
      { type: "option" as const, label: "A", value: "a", index: 1 },
    ];
    const sorted = sortAnswers(answers);
    expect(sorted[0].type).toBe("option");
    expect((sorted[0] as any).index).toBe(1);
    expect(sorted[2].type).toBe("other");
  });
});

describe("cancelledResult", () => {
  it("returns cancelled status", () => {
    const result = cancelledResult("question?", "text");
    expect(result.details.status).toBe("cancelled");
    expect(result.details.question).toBe("question?");
    expect(result.content[0].text).toContain("cancelled");
  });
});

describe("unavailableResult", () => {
  it("returns unavailable status with message", () => {
    const result = unavailableResult("q?", "text", "No UI");
    expect(result.details.status).toBe("unavailable");
    expect(result.content[0].text).toBe("No UI");
  });
});

describe("buildResult", () => {
  it("formats text answer", () => {
    const result = buildResult("q?", undefined, "text", [
      { type: "text", label: "my answer", value: "my answer" },
    ]);
    expect(result.content[0].text).toContain("my answer");
    expect(result.details.status).toBe("answered");
  });
  it("formats single-select", () => {
    const result = buildResult("q?", undefined, "single-select", [
      { type: "option", label: "Choice", value: "c", index: 1 },
    ]);
    expect(result.content[0].text).toContain("1. Choice");
  });
  it("formats multi-select", () => {
    const result = buildResult("q?", undefined, "multi-select", [
      { type: "option", label: "A", value: "a", index: 1 },
      { type: "option", label: "B", value: "b", index: 2 },
    ]);
    expect(result.content[0].text).toContain("A");
    expect(result.content[0].text).toContain("B");
  });
});
