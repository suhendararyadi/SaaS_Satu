import { describe, expect, it } from "vitest";
import {
  comparableScore,
  riskLevelFromScore,
  riskTrend,
  scoreSignals,
  type StudentRiskSignal,
} from "./studentRisk";

const signal = (
  id: string,
  source: StudentRiskSignal["source"],
  points: number,
  comparableWindow?: StudentRiskSignal["comparableWindow"],
): StudentRiskSignal => ({
  id,
  source,
  code: id,
  title: id,
  detail: id,
  points,
  href: "/school",
  occurredAt: new Date("2026-09-15T00:00:00Z"),
  comparableWindow,
});

describe("student risk engine", () => {
  it("maps risk levels at defined thresholds", () => {
    expect(riskLevelFromScore(19)).toBe("NORMAL");
    expect(riskLevelFromScore(20)).toBe("WATCH");
    expect(riskLevelFromScore(40)).toBe("MEDIUM");
    expect(riskLevelFromScore(60)).toBe("HIGH");
    expect(riskLevelFromScore(80)).toBe("CRITICAL");
  });

  it("caps contribution per source and total score", () => {
    const result = scoreSignals([
      signal("a1", "ATTENDANCE", 25),
      signal("a2", "ATTENDANCE", 25),
      signal("s", "STUDENT_AFFAIRS", 30),
      signal("l", "LEARNING", 30),
      signal("p", "PKL", 30),
      signal("f", "FOLLOW_UP", 30),
    ]);
    expect(result.sourceScores.ATTENDANCE).toBe(30);
    expect(result.sourceScores.STUDENT_AFFAIRS).toBe(25);
    expect(result.sourceScores.LEARNING).toBe(20);
    expect(result.sourceScores.PKL).toBe(15);
    expect(result.sourceScores.FOLLOW_UP).toBe(20);
    expect(result.score).toBe(100);
    expect(result.level).toBe("CRITICAL");
  });

  it("calculates comparable 30-day windows separately", () => {
    const signals = [
      signal("current", "ATTENDANCE", 12, "CURRENT"),
      signal("previous", "ATTENDANCE", 4, "PREVIOUS"),
      signal("live-only", "PKL", 10, null),
    ];
    expect(comparableScore(signals, "CURRENT")).toBe(12);
    expect(comparableScore(signals, "PREVIOUS")).toBe(4);
  });

  it("classifies meaningful risk trend changes", () => {
    expect(riskTrend(30, 15).code).toBe("WORSENING");
    expect(riskTrend(15, 30).code).toBe("IMPROVING");
    expect(riskTrend(24, 20).code).toBe("STABLE");
  });
});
