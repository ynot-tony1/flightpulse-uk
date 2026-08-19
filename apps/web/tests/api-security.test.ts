import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAirports } from "@/app/api/airports/route";
import { GET as getMapRoutes } from "@/app/api/map/routes/route";

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("GET /api/airports — parameter validation", () => {
  it("rejects an unknown sort value instead of passing it to the database", async () => {
    const response = await getAirports(
      requestFor("/api/airports?sort=DROP TABLE airports;"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.message).not.toMatch(/DROP TABLE/i);
  });

  it("rejects an oversized page size rather than silently clamping", async () => {
    const response = await getAirports(
      requestFor("/api/airports?pageSize=999999"),
    );
    expect(response.status).toBe(400);
  });

  it("accepts a valid request and never leaks a raw database error", async () => {
    const response = await getAirports(
      requestFor("/api/airports?sort=passengers&page=1"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.items).toEqual([]); // no database configured in test env
    expect(JSON.stringify(body)).not.toMatch(/postgres|password|ECONNREFUSED/i);
  });
});

describe("GET /api/map/routes — bounded route count", () => {
  it("rejects a route count outside the allowlist", async () => {
    const response = await getMapRoutes(
      requestFor("/api/map/routes?year=2026&month=1&count=100000"),
    );
    expect(response.status).toBe(400);
  });

  it("requires year and month", async () => {
    const response = await getMapRoutes(requestFor("/api/map/routes?count=25"));
    expect(response.status).toBe(400);
  });
});
