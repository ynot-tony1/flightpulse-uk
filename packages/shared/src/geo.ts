const EARTH_RADIUS_KM = 6371.0088;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Approximate great-circle (haversine) distance in kilometres between two
 * airport coordinates. This is an analytical convenience, not a CAA-published
 * statistic, and does not represent actual flown distance (see
 * docs/methodology.md#route-distance).
 */
export function greatCircleDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}
