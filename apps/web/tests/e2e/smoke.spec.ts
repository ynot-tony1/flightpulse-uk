import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", heading: "UK aviation, measured from official statistics." },
  { path: "/airports", heading: "Airports" },
  { path: "/routes", heading: "Routes" },
  { path: "/punctuality", heading: "Punctuality" },
  { path: "/airlines", heading: "Airlines" },
  { path: "/compare", heading: "Compare airports" },
  { path: "/about/data", heading: "Methodology & data sources" },
  { path: "/status", heading: "System status" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders its main heading`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
  });
}

test("navigation links between top-level sections", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Airports", exact: true }).click();
  await expect(page).toHaveURL(/\/airports$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Airports",
  );
});

test("map page loads without a console error and shows the graceful empty state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/map");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Route map",
  );
  await expect(
    page.getByText(/No airport data available for this period yet/),
  ).toBeVisible({
    timeout: 15_000,
  });

  expect(errors).toEqual([]);
});

test("mobile navigation menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only nav behaviour");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Primary mobile" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
});

test("invalid API query parameters return a safe 400, not a raw error", async ({
  request,
}) => {
  const response = await request.get("/api/airports?sort=invalid-value");
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.message).toBeTruthy();
});
