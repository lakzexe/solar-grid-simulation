import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import type { SimRun, SimRunSummary, UserPublic } from "./types";

export const qk = {
  me: ["me"] as const,
  runs: ["runs"] as const,
  integrations: ["integrations"] as const,
  run: (id: string) => ["run", id] as const,
};

export const WEATHER_LABEL = { sunny: "Sunny", partly_cloudy: "Partly cloudy", overcast: "Overcast", rainy: "Rainy" } as const;
export const PROFILE_LABEL = { residential: "Residential", evening_peak: "Evening peak", daytime_home: "Daytime occupancy", flat: "Flat" } as const;

export function useMe() { return useQuery({ queryKey: qk.me, queryFn: () => apiGet<UserPublic>("/auth/me") }); }
export function useRuns() { return useQuery({ queryKey: qk.runs, queryFn: () => apiGet<SimRunSummary[]>("/simulations") }); }

interface ActiveRunContextValue { runId: string | null; setRunId: (id: string) => void; }
export const ActiveRunContext = createContext<ActiveRunContextValue>({ runId: null, setRunId: () => undefined });
export function useActiveRunId() { return useContext(ActiveRunContext); }
export function useActiveRun() {
  const { runId } = useActiveRunId();
  return useQuery({ queryKey: runId ? qk.run(runId) : ["run", null], queryFn: () => apiGet<SimRun>(`/simulations/${runId}`), enabled: Boolean(runId) });
}

export function fmt(value: number, digits = 1) { return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "-"; }
export function money(value: number, currency = "LKR") { return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value) : "-"; }
export function hh(hour: number) { return `${String(Math.round(hour)).padStart(2, "0")}:00`; }
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
