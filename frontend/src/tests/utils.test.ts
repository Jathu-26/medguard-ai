import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDate,
  confidenceLabel,
  confidenceScorePercent,
  riskBadge,
  statusColor,
  MEDICAL_DISCLAIMER,
} from "../../lib/utils";

describe("Frontend Healthcare Utility Functions", () => {
  it("formatBytes should format file sizes accurately", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(20971520)).toBe("20 MB");
  });

  it("formatDate should format ISO dates into clinical human format", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate("2026-08-01")).toContain("2026");
  });

  it("confidenceLabel should categorize confidence percentiles", () => {
    expect(confidenceLabel(0.95)).toBe("Very High (90%+)");
    expect(confidenceLabel(0.80)).toBe("High (75-89%)");
    expect(confidenceLabel(0.60)).toBe("Moderate (55-74%)");
    expect(confidenceLabel(0.40)).toBe("Low (35-54%)");
    expect(confidenceLabel(0.20)).toBe("Needs Review (<35%)");
  });

  it("confidenceScorePercent handles normalized and percentage inputs", () => {
    expect(confidenceScorePercent(0.85)).toBe(85);
    expect(confidenceScorePercent(95)).toBe(95);
    expect(confidenceScorePercent(0)).toBe(0);
  });

  it("riskBadge returns appropriate severity badge objects", () => {
    const critical = riskBadge("critical");
    expect(critical.label).toBe("Critical Risk");
    expect(critical.className).toContain("rose");

    const high = riskBadge("high");
    expect(high.label).toBe("High Risk");

    const medium = riskBadge("medium");
    expect(medium.label).toBe("Medium Risk");

    const low = riskBadge("low");
    expect(low.label).toBe("Low Risk");
  });

  it("statusColor returns appropriate classes for document and alert status", () => {
    expect(statusColor("completed")).toContain("emerald");
    expect(statusColor("failed")).toContain("rose");
    expect(statusColor("processing")).toContain("pulse");
  });

  it("MEDICAL_DISCLAIMER is defined and includes safety advice", () => {
    expect(MEDICAL_DISCLAIMER).toContain("AI-assisted document review");
    expect(MEDICAL_DISCLAIMER).toContain("professional medical advice");
  });
});
