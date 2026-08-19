import { getSystemStatus } from "@/lib/data/status";
import { jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getSystemStatus();
  return jsonOk(status, { cacheSeconds: 30 });
}
