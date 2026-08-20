"use client";

import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

const LoadedMap = dynamic(
  () => import("./world-route-map").then((m) => m.WorldRouteMap),
  {
    ssr: false,
    loading: () => <LoadingSkeleton className="h-[600px] w-full" />,
  },
);

export function WorldRouteMap({
  initialYear,
  initialMonth,
}: {
  initialYear?: number;
  initialMonth?: number;
}) {
  return <LoadedMap initialYear={initialYear} initialMonth={initialMonth} />;
}
