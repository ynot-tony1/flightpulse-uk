/**
 * Shared analytics primitives. Kept intentionally small and pure so they can
 * be unit tested in isolation (see apps/web/tests/analytics.test.ts) and
 * reused by both server components and API routes.
 *
 * These implement the calculation rules from docs/methodology.md — in
 * particular the "do not divide by zero" and "do not average pre-aggregated
 * percentages" rules.
 */

export interface PercentageChangeResult {
  absoluteChange: number;
  percentageChange: number | null;
  isNewBaseline: boolean;
}

export function percentageChange(
  oldValue: number,
  newValue: number,
): PercentageChangeResult {
  const absoluteChange = newValue - oldValue;
  if (oldValue === 0) {
    return { absoluteChange, percentageChange: null, isNewBaseline: true };
  }
  return {
    absoluteChange,
    percentageChange: (absoluteChange / oldValue) * 100,
    isNewBaseline: false,
  };
}

export interface WeightedSample {
  value: number;
  weight: number;
}

/**
 * Flight-weighted average delay. Only valid when every sample carries a
 * genuine flights-represented weight from the source data — never call this
 * with an assumed/default weight.
 */
export function weightedAverage(samples: WeightedSample[]): number | null {
  const totalWeight = samples.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight <= 0) return null;
  const weightedSum = samples.reduce((sum, s) => sum + s.value * s.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * On-time percentage aggregated from underlying flight counts, never from
 * averaging pre-computed percentages.
 */
export function aggregateOnTimePercentage(
  onTimeFlights: number,
  totalFlights: number,
): number | null {
  if (totalFlights <= 0) return null;
  return (onTimeFlights / totalFlights) * 100;
}

export interface MonthlyPoint {
  year: number;
  month: number; // 1-12
  value: number;
}

/**
 * Latest 12 *complete* monthly periods ending at (or before) the given
 * reference period. Explicitly a rolling window, not a calendar year.
 */
export function rollingTwelveMonths(
  points: MonthlyPoint[],
  referenceYear: number,
  referenceMonth: number,
): MonthlyPoint[] {
  const sorted = [...points].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
  );
  const refIndex = referenceYear * 12 + referenceMonth;
  return sorted.filter((p) => {
    const idx = p.year * 12 + p.month;
    return idx <= refIndex && idx > refIndex - 12;
  });
}

export function rollingTwelveMonthSum(
  points: MonthlyPoint[],
  referenceYear: number,
  referenceMonth: number,
): number | null {
  const window = rollingTwelveMonths(points, referenceYear, referenceMonth);
  if (window.length < 12) return null;
  return window.reduce((sum, p) => sum + p.value, 0);
}

/**
 * Market/traffic share with an explicit, named denominator. Callers must
 * state what the denominator represents (e.g. "all UK airport passengers"),
 * this function only guards the division.
 */
export function share(part: number, total: number): number | null {
  if (total <= 0) return null;
  return part / total;
}

/**
 * Monthly seasonal profile: percentage of annual traffic represented by each
 * month, averaged across whichever complete years are supplied. Incomplete
 * years should be filtered out by the caller before calling this — this
 * function does not know which years are complete.
 */
export function seasonalProfile(
  points: MonthlyPoint[],
): { month: number; averageShareOfYear: number }[] {
  const byYear = new Map<number, MonthlyPoint[]>();
  for (const p of points) {
    const arr = byYear.get(p.year) ?? [];
    arr.push(p);
    byYear.set(p.year, arr);
  }

  const monthShares = new Map<number, number[]>();
  for (const [, yearPoints] of byYear) {
    const yearTotal = yearPoints.reduce((sum, p) => sum + p.value, 0);
    if (yearTotal <= 0) continue;
    for (const p of yearPoints) {
      const arr = monthShares.get(p.month) ?? [];
      arr.push(p.value / yearTotal);
      monthShares.set(p.month, arr);
    }
  }

  return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
    const shares = monthShares.get(month) ?? [];
    const averageShareOfYear =
      shares.length > 0 ? shares.reduce((a, b) => a + b, 0) / shares.length : 0;
    return { month, averageShareOfYear };
  });
}

export interface MonthlyAveragePoint {
  month: number; // 1-12
  average: number;
  occurrences: number;
}

/**
 * Average value per calendar month across however many years of data are
 * available. Unlike seasonalProfile, this does not require complete
 * calendar years, so it starts producing a genuine average as soon as any
 * calendar month has occurred more than once — a much lower bar than a
 * fixed "N months imported" threshold, since consecutive monthly backfill
 * data can span a year boundary (e.g. Aug-Dec of one year plus Jan-Jun of
 * the next) without a single calendar month repeating, in which case no
 * amount of "more consecutive months" produces a meaningful average until
 * the span actually wraps past 12 months.
 *
 * Callers must treat a result where every occurrences === 1 as "not yet
 * meaningful" — it is a re-labelling of the raw trend, not an average of
 * anything. See hasRepeatedCalendarMonth.
 */
export function monthlyAverages(points: MonthlyPoint[]): MonthlyAveragePoint[] {
  const byMonth = new Map<number, number[]>();
  for (const p of points) {
    const arr = byMonth.get(p.month) ?? [];
    arr.push(p.value);
    byMonth.set(p.month, arr);
  }
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((month) => byMonth.has(month))
    .map((month) => {
      const values = byMonth.get(month) as number[];
      return {
        month,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        occurrences: values.length,
      };
    });
}

export function hasRepeatedCalendarMonth(points: MonthlyPoint[]): boolean {
  return monthlyAverages(points).some((m) => m.occurrences >= 2);
}
