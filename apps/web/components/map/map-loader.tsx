"use client";

import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export const WorldRouteMap = dynamic(
  () => import("./world-route-map").then((m) => m.WorldRouteMap),
  {
    ssr: false,
    loading: () => <LoadingSkeleton className="h-[600px] w-full" />,
  },
);
