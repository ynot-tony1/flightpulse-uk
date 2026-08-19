import { EmptyState } from "./empty-state";

/**
 * Shown wherever a page needs live CockroachDB data and the database has
 * not been provisioned yet — see docs/deployment.md#deferred-database-setup.
 * Deliberately explicit rather than silently showing zeros or fabricated
 * numbers.
 */
export function DatabasePendingNotice({
  subject = "This data",
}: {
  subject?: string;
}) {
  return (
    <EmptyState
      title="Database connection not yet configured"
      description={`${subject} will appear once CockroachDB Cloud provisioning is complete and the ingestion pipeline has run. See /status for current system state.`}
    />
  );
}
