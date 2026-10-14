import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { errorMessage, useActiveRun, useActiveRunId, useRuns } from "@/lib/hooks";
import type { SimRun } from "@/lib/types";
import { EmptyState, ErrorState, LoadingBlock, SkeletonGrid } from "./common";

/** Resolves the header-selected run and renders loading / empty / error states around it. */
export function RunView({ children }: { children: (run: SimRun) => ReactNode }) {
  const runs = useRuns();
  const { runId } = useActiveRunId();
  const run = useActiveRun();

  if (runs.isLoading || (runId && run.isLoading)) {
    return (
      <div className="space-y-6">
        <SkeletonGrid />
        <LoadingBlock className="min-h-72" />
      </div>
    );
  }
  if (runs.isError) return <ErrorState message={errorMessage(runs.error)} onRetry={() => runs.refetch()} />;
  if (!runId)
    return (
      <EmptyState
        title="No simulation runs yet"
        description="Configure your community microgrid and run the engine to see energy balance, forecasts and resilience analytics."
        action={
          <Link data-testid="empty-go-simulation" to="/simulation" className={buttonVariants({ size: "sm" })}>
            Open simulation studio
          </Link>
        }
      />
    );
  if (run.isError || !run.data) return <ErrorState message={errorMessage(run.error)} onRetry={() => run.refetch()} />;
  return <>{children(run.data)}</>;
}
