-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "airports" (
    "id" STRING NOT NULL,
    "canonical_code" STRING NOT NULL,
    "iata_code" STRING,
    "icao_code" STRING,
    "caa_name" STRING NOT NULL,
    "display_name" STRING NOT NULL,
    "normalised_name" STRING NOT NULL,
    "municipality" STRING,
    "country_code" STRING NOT NULL,
    "country_name" STRING NOT NULL,
    "uk_nation" STRING,
    "region" STRING,
    "latitude" FLOAT8 NOT NULL,
    "longitude" FLOAT8 NOT NULL,
    "elevation_ft" INT4,
    "airport_type" STRING NOT NULL,
    "caa_reporting_airport" BOOL NOT NULL DEFAULT false,
    "punctuality_monitored" BOOL NOT NULL DEFAULT false,
    "source_reference_id" STRING,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_aliases" (
    "id" STRING NOT NULL,
    "airport_id" STRING NOT NULL,
    "source" STRING NOT NULL,
    "source_name" STRING NOT NULL,
    "normalised_name" STRING NOT NULL,
    "reviewed" BOOL NOT NULL DEFAULT false,
    "match_method" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airport_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_monthly_metrics" (
    "id" STRING NOT NULL,
    "airport_id" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4 NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "metric_code" STRING NOT NULL,
    "value" FLOAT8 NOT NULL,
    "unit" STRING NOT NULL,
    "source_dataset_id" STRING NOT NULL,
    "source_release_id" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airport_monthly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" STRING NOT NULL,
    "origin_airport_id" STRING NOT NULL,
    "destination_airport_id" STRING NOT NULL,
    "route_type" STRING NOT NULL,
    "distance_km" FLOAT8,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_monthly_metrics" (
    "id" STRING NOT NULL,
    "route_id" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4 NOT NULL,
    "passengers" FLOAT8,
    "flights" FLOAT8,
    "seats" FLOAT8,
    "freight_tonnes" FLOAT8,
    "source_table" STRING NOT NULL,
    "source_dataset_id" STRING NOT NULL,
    "source_release_id" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_monthly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "punctuality_metrics" (
    "id" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4 NOT NULL,
    "airport_id" STRING NOT NULL,
    "destination_airport_id" STRING,
    "airline_id" STRING,
    "service_type" STRING,
    "direction_type" STRING,
    "flights_matched" INT4,
    "average_delay_minutes" FLOAT8,
    "on_time_percentage" FLOAT8,
    "delay_15_percentage" FLOAT8,
    "delay_30_percentage" FLOAT8,
    "delay_60_percentage" FLOAT8,
    "cancelled_count" INT4,
    "source_dataset_id" STRING NOT NULL,
    "source_release_id" STRING NOT NULL,
    "methodology_version" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "punctuality_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airlines" (
    "id" STRING NOT NULL,
    "canonical_name" STRING NOT NULL,
    "normalised_name" STRING NOT NULL,
    "caa_name" STRING NOT NULL,
    "iata_code" STRING,
    "icao_code" STRING,
    "country_code" STRING,
    "active" BOOL NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airline_monthly_metrics" (
    "id" STRING NOT NULL,
    "airline_id" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4 NOT NULL,
    "metric_code" STRING NOT NULL,
    "value" FLOAT8 NOT NULL,
    "unit" STRING NOT NULL,
    "service_category" STRING,
    "source_dataset_id" STRING NOT NULL,
    "source_release_id" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airline_monthly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_datasets" (
    "id" STRING NOT NULL,
    "source_organisation" STRING NOT NULL,
    "dataset_code" STRING NOT NULL,
    "dataset_name" STRING NOT NULL,
    "data_family" STRING NOT NULL,
    "official_url" STRING NOT NULL,
    "licence_or_terms_url" STRING NOT NULL,
    "required_attribution" STRING NOT NULL,
    "update_frequency" STRING NOT NULL,
    "enabled" BOOL NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_releases" (
    "id" STRING NOT NULL,
    "source_dataset_id" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4 NOT NULL,
    "publication_date" TIMESTAMP(3),
    "revision_date" TIMESTAMP(3),
    "source_url" STRING NOT NULL,
    "download_url" STRING NOT NULL,
    "etag" STRING,
    "last_modified" STRING,
    "checksum_sha256" STRING NOT NULL,
    "file_size_bytes" INT4,
    "status" STRING NOT NULL,
    "rows_imported" INT4,
    "retrieved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "metric_code" STRING NOT NULL,
    "display_name" STRING NOT NULL,
    "description" STRING NOT NULL,
    "unit" STRING NOT NULL,
    "source_definition" STRING NOT NULL,
    "calculation_method" STRING NOT NULL,
    "methodology_version" STRING NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("metric_code")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" STRING NOT NULL,
    "source_dataset_id" STRING NOT NULL,
    "source_release_id" STRING,
    "status" STRING NOT NULL,
    "rows_seen" INT4 NOT NULL DEFAULT 0,
    "rows_inserted" INT4 NOT NULL DEFAULT 0,
    "rows_updated" INT4 NOT NULL DEFAULT 0,
    "rows_unchanged" INT4 NOT NULL DEFAULT 0,
    "rows_rejected" INT4 NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" FLOAT8,
    "workflow_run_id" STRING,
    "git_sha" STRING,
    "error_summary" STRING,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregate_metrics" (
    "id" STRING NOT NULL,
    "scope" STRING NOT NULL,
    "scope_key" STRING NOT NULL,
    "year" INT4 NOT NULL,
    "month" INT4,
    "metric_code" STRING NOT NULL,
    "value" FLOAT8 NOT NULL,
    "unit" STRING NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airports_canonical_code_key" ON "airports"("canonical_code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_iata_code_key" ON "airports"("iata_code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_icao_code_key" ON "airports"("icao_code");

-- CreateIndex
CREATE INDEX "airports_normalised_name_idx" ON "airports"("normalised_name");

-- CreateIndex
CREATE INDEX "airport_aliases_airport_id_idx" ON "airport_aliases"("airport_id");

-- CreateIndex
CREATE UNIQUE INDEX "airport_aliases_source_source_name_key" ON "airport_aliases"("source", "source_name");

-- CreateIndex
CREATE INDEX "airport_monthly_metrics_airport_id_year_month_idx" ON "airport_monthly_metrics"("airport_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "airport_monthly_metrics_airport_id_year_month_metric_code_key" ON "airport_monthly_metrics"("airport_id", "year", "month", "metric_code");

-- CreateIndex
CREATE INDEX "routes_origin_airport_id_idx" ON "routes"("origin_airport_id");

-- CreateIndex
CREATE INDEX "routes_destination_airport_id_idx" ON "routes"("destination_airport_id");

-- CreateIndex
CREATE UNIQUE INDEX "routes_origin_airport_id_destination_airport_id_key" ON "routes"("origin_airport_id", "destination_airport_id");

-- CreateIndex
CREATE INDEX "route_monthly_metrics_route_id_year_month_idx" ON "route_monthly_metrics"("route_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "route_monthly_metrics_route_id_year_month_key" ON "route_monthly_metrics"("route_id", "year", "month");

-- CreateIndex
CREATE INDEX "punctuality_metrics_year_month_idx" ON "punctuality_metrics"("year", "month");

-- CreateIndex
CREATE INDEX "punctuality_metrics_airport_id_idx" ON "punctuality_metrics"("airport_id");

-- CreateIndex
CREATE INDEX "punctuality_metrics_destination_airport_id_idx" ON "punctuality_metrics"("destination_airport_id");

-- CreateIndex
CREATE INDEX "punctuality_metrics_airline_id_idx" ON "punctuality_metrics"("airline_id");

-- CreateIndex
CREATE UNIQUE INDEX "airlines_normalised_name_key" ON "airlines"("normalised_name");

-- CreateIndex
CREATE UNIQUE INDEX "airline_monthly_metrics_airline_id_year_month_metric_code_s_key" ON "airline_monthly_metrics"("airline_id", "year", "month", "metric_code", "service_category");

-- CreateIndex
CREATE UNIQUE INDEX "source_datasets_dataset_code_key" ON "source_datasets"("dataset_code");

-- CreateIndex
CREATE INDEX "source_releases_source_dataset_id_year_month_idx" ON "source_releases"("source_dataset_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "source_releases_source_dataset_id_year_month_checksum_sha25_key" ON "source_releases"("source_dataset_id", "year", "month", "checksum_sha256");

-- CreateIndex
CREATE INDEX "ingestion_runs_source_dataset_id_idx" ON "ingestion_runs"("source_dataset_id");

-- CreateIndex
CREATE INDEX "aggregate_metrics_scope_year_month_idx" ON "aggregate_metrics"("scope", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "aggregate_metrics_scope_scope_key_year_month_metric_code_key" ON "aggregate_metrics"("scope", "scope_key", "year", "month", "metric_code");

-- AddForeignKey
ALTER TABLE "airport_aliases" ADD CONSTRAINT "airport_aliases_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_monthly_metrics" ADD CONSTRAINT "airport_monthly_metrics_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_airport_id_fkey" FOREIGN KEY ("origin_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_airport_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_monthly_metrics" ADD CONSTRAINT "route_monthly_metrics_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punctuality_metrics" ADD CONSTRAINT "punctuality_metrics_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punctuality_metrics" ADD CONSTRAINT "punctuality_metrics_destination_airport_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punctuality_metrics" ADD CONSTRAINT "punctuality_metrics_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airline_monthly_metrics" ADD CONSTRAINT "airline_monthly_metrics_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_releases" ADD CONSTRAINT "source_releases_source_dataset_id_fkey" FOREIGN KEY ("source_dataset_id") REFERENCES "source_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

