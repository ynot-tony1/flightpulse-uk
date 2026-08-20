import { describe, expect, it } from "vitest";
import {
  aggregateOnTimePercentage,
  hasRepeatedCalendarMonth,
  monthlyAverages,
  percentageChange,
  rollingTwelveMonthSum,
  rollingTwelveMonths,
  seasonalProfile,
  share,
  weightedAverage,
} from "@flightpulse/shared";

describe("percentageChange", () => {
  it("computes a normal increase", () => {
    const result = percentageChange(100, 110);
    expect(result.percentageChange).toBeCloseTo(10);
    expect(result.absoluteChange).toBe(10);
    expect(result.isNewBaseline).toBe(false);
  });

  it("never divides by zero — returns a new-baseline flag instead", () => {
    const result = percentageChange(0, 500);
    expect(result.percentageChange).toBeNull();
    expect(result.isNewBaseline).toBe(true);
    expect(result.absoluteChange).toBe(500);
  });

  it("handles a decrease", () => {
    const result = percentageChange(200, 150);
    expect(result.percentageChange).toBeCloseTo(-25);
  });
});

describe("weightedAverage", () => {
  it("weights by flights represented, not a plain mean", () => {
    // Plain mean of [10, 30] would be 20; weighted by flights should skew
    // toward the value with more flights.
    const result = weightedAverage([
      { value: 10, weight: 900 },
      { value: 30, weight: 100 },
    ]);
    expect(result).toBeCloseTo(12);
  });

  it("returns null when total weight is zero rather than dividing by zero", () => {
    expect(weightedAverage([{ value: 10, weight: 0 }])).toBeNull();
    expect(weightedAverage([])).toBeNull();
  });
});

describe("aggregateOnTimePercentage", () => {
  it("computes from underlying flight counts", () => {
    expect(aggregateOnTimePercentage(850, 1000)).toBeCloseTo(85);
  });

  it("returns null for zero total flights", () => {
    expect(aggregateOnTimePercentage(0, 0)).toBeNull();
  });
});

describe("rollingTwelveMonths", () => {
  const twoYearsOfPoints = Array.from({ length: 24 }, (_, i) => ({
    year: 2024 + Math.floor(i / 12),
    month: (i % 12) + 1,
    value: i,
  }));

  it("returns exactly the latest 12 complete months ending at the reference period", () => {
    const window = rollingTwelveMonths(twoYearsOfPoints, 2025, 12);
    expect(window).toHaveLength(12);
    expect(window[0]).toEqual({ year: 2025, month: 1, value: 12 });
    expect(window[11]).toEqual({ year: 2025, month: 12, value: 23 });
  });

  it("sums the window and returns null if fewer than 12 months are available", () => {
    const shortHistory = twoYearsOfPoints.slice(0, 6);
    expect(rollingTwelveMonthSum(shortHistory, 2024, 6)).toBeNull();

    const sum = rollingTwelveMonthSum(twoYearsOfPoints, 2025, 12);
    expect(sum).toBe(window_sum(12, 23));

    function window_sum(from: number, to: number) {
      let total = 0;
      for (let v = from; v <= to; v++) total += v;
      return total;
    }
  });
});

describe("share", () => {
  it("computes a simple proportion", () => {
    expect(share(25, 100)).toBeCloseTo(0.25);
  });

  it("returns null for a non-positive denominator", () => {
    expect(share(10, 0)).toBeNull();
    expect(share(10, -5)).toBeNull();
  });
});

describe("seasonalProfile", () => {
  it("averages month share across complete years only (caller-filtered)", () => {
    const points = [
      { year: 2024, month: 1, value: 10 },
      { year: 2024, month: 2, value: 30 },
      { year: 2025, month: 1, value: 20 },
      { year: 2025, month: 2, value: 20 },
    ];
    const profile = seasonalProfile(points);
    const jan = profile.find((p) => p.month === 1)!;
    // 2024: 10/40=0.25, 2025: 20/40=0.5 -> average 0.375
    expect(jan.averageShareOfYear).toBeCloseTo(0.375);
  });

  it("returns zero share for months with no data", () => {
    const profile = seasonalProfile([{ year: 2024, month: 1, value: 10 }]);
    const july = profile.find((p) => p.month === 7)!;
    expect(july.averageShareOfYear).toBe(0);
  });
});

describe("monthlyAverages", () => {
  it("averages a repeated calendar month across years", () => {
    const points = [
      { year: 2024, month: 6, value: 100 },
      { year: 2025, month: 6, value: 140 },
      { year: 2025, month: 7, value: 50 },
    ];
    const result = monthlyAverages(points);
    const june = result.find((p) => p.month === 6)!;
    expect(june.average).toBeCloseTo(120);
    expect(june.occurrences).toBe(2);
    const july = result.find((p) => p.month === 7)!;
    expect(july.average).toBeCloseTo(50);
    expect(july.occurrences).toBe(1);
  });

  it("omits calendar months with no data at all", () => {
    const result = monthlyAverages([{ year: 2025, month: 3, value: 10 }]);
    expect(result.map((p) => p.month)).toEqual([3]);
  });
});

describe("hasRepeatedCalendarMonth", () => {
  it("is false for a run of consecutive months spanning a year boundary", () => {
    // e.g. Aug 2025 - Jun 2026 — 11 consecutive months, no repeats.
    const points = Array.from({ length: 11 }, (_, i) => {
      const month = ((7 + i) % 12) + 1;
      const year = 7 + i < 12 ? 2025 : 2026;
      return { year, month, value: 1 };
    });
    expect(hasRepeatedCalendarMonth(points)).toBe(false);
  });

  it("is true once any calendar month occurs twice", () => {
    const points = [
      { year: 2025, month: 8, value: 1 },
      { year: 2026, month: 8, value: 1 },
    ];
    expect(hasRepeatedCalendarMonth(points)).toBe(true);
  });
});
