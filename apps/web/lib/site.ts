const PRODUCTION_URL = "https://flightpulse-uk.vercel.app";

export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : PRODUCTION_URL;
