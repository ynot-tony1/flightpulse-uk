import { describe, expect, it } from "vitest";
import { greatCircleDistanceKm } from "@flightpulse/shared";

describe("greatCircleDistanceKm", () => {
  it("is zero for identical coordinates", () => {
    const point = { latitude: 51.47, longitude: -0.4543 };
    expect(greatCircleDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it("approximates the known LHR-AMS distance (~360km)", () => {
    const lhr = { latitude: 51.4706, longitude: -0.461941 };
    const ams = { latitude: 52.308613, longitude: 4.763889 };
    const distance = greatCircleDistanceKm(lhr, ams);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(380);
  });

  it("is symmetric", () => {
    const a = { latitude: 55.9, longitude: -3.36 };
    const b = { latitude: 53.48, longitude: -2.24 };
    expect(greatCircleDistanceKm(a, b)).toBeCloseTo(
      greatCircleDistanceKm(b, a),
      6,
    );
  });
});
