export type UkNation = "England" | "Scotland" | "Wales" | "Northern Ireland";

export type MapMode =
  | "PASSENGER_ROUTES"
  | "AIRPORT_TRAFFIC"
  | "PUNCTUALITY"
  | "AVERAGE_DELAY"
  | "DOMESTIC"
  | "INTERNATIONAL"
  | "FREIGHT"
  | "GROWTH";

export interface SourcePeriod {
  year: number;
  month: number;
}

export interface AttributedSource {
  datasetName: string;
  officialUrl: string;
  publicationDate: string | null;
  period: SourcePeriod;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  requestId: string;
}

export interface AirportSummary {
  id: string;
  canonicalCode: string;
  iataCode: string | null;
  icaoCode: string | null;
  displayName: string;
  municipality: string | null;
  ukNation: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  punctualityMonitored: boolean;
  latestMonthlyPassengers: number | null;
  latestMonthlyMovements: number | null;
}

export interface RouteSummary {
  id: string;
  origin: AirportSummary;
  destination: AirportSummary;
  routeType: "domestic" | "international";
  distanceKm: number | null;
  latestMonthlyPassengers: number | null;
}
