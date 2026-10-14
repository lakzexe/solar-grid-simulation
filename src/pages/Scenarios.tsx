import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, CheckCircle2, GitCompareArrows, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBadge, EmptyState, LoadingBlock, MiniMarkdown, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { apiDelete, apiPost } from "@/lib/api";
import { errorMessage, fmt, money, qk, useMe, useRuns } from "@/lib/hooks";
import type { Explanation, SimRun, SimRunSummary } from "@/lib/types";

export default function Scenarios() {
  const qc = useQueryClient();
  const me = useMe();
  const runs = useRuns();
  const currency = me.data?.currency ?? "USD";

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonExp, setComparisonExp] = useState<Explanation | null>(null);

  // Initialize selection with first 2-3 runs if empty
  const allRuns = runs.data ?? [];
  const activeIds = selectedIds.length > 0 ? selectedIds : allRuns.slice(0, 3).map((r) => r.id);

  const toggleSelect = (id: string) => {
    if (activeIds.includes(id)) {
      if (activeIds.length <= 2) {
        toast.info("Select at least 2 scenarios to compare");
        return;
      }
      setSelectedIds(activeIds.filter((x) => x !== id));
    } else {
      if (activeIds.length >= 3) {
        toast.info("You can compare up to 3 scenarios side-by-side");
        return;
      }
      setSelectedIds([...activeIds, id]);
    }
  };

  const compareMutation = useMutation({
    mutationFn: () => apiPost<Explanation>("/compare/explain", { ids: activeIds }),
    onSuccess: (data) => {
      setComparisonExp(data);
      toast.success(data.source === "gemini" ? "Gemini comparative analysis ready" : "Rule-based comparison generated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/simulations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.runs });
      toast.success("Scenario deleted");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const selectedRuns = allRuns.filter((r) => activeIds.includes(r.id));

  const chartData = selectedRuns.map((r) => ({
    name: r.name.length > 20 ? `${r.name.slice(0, 20)}…` : r.name,
    "Self-sufficiency %": r.summary.self_sufficiency_pct,
    "Generation kWh": r.summary.total_generation_kwh,
    "Demand kWh": r.summary.total_demand_kwh,
    "Import kWh": r.summary.grid_import_kwh,
    "Export kWh": r.summary.grid_export_kwh,
    "Curtailed kWh": r.summary.curtailment_kwh,
  }));

  return (
    <PageFade>
      <PageHeader
        eyebrow="Decision intelligence"
        title="Scenario comparison"
        description="Benchmark and evaluate up to 3 microgrid configurations side-by-side. Understand self-sufficiency, tariffs, battery utilization and resiliency trade-offs."
        actions={
          <Link to="/simulation" data-testid="scenarios-new-sim-link" className={buttonVariants({ size: "sm" })}>
            Create new scenario
          </Link>
        }
      />

      {runs.isLoading && <LoadingBlock label="Loading saved scenarios…" />}
      {runs.isError && <EmptyState title="Could not load scenarios" description={errorMessage(runs.error)} />}

      {!runs.isLoading && allRuns.length === 0 && (
        <EmptyState
          title="No scenarios to compare"
          description="Create and save at least two microgrid configurations to compare their operational metrics."
          action={
            <Link to="/simulation" className={buttonVariants({ size: "sm" })}>
              Run simulation
            </Link>
          }
        />
      )}

      {!runs.isLoading && allRuns.length > 0 && (
        <div className="space-y-6">
          <Panel title="Select scenarios to compare" subtitle="Pick 2 or 3 scenarios (click to toggle)" testId="scenarios-selection-panel">
            <div className="flex flex-wrap gap-2.5">
              {allRuns.map((r) => {
                const active = activeIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 transition-all cursor-pointer ${
                      active
                        ? "border-[#059669] bg-[#EBF8F2] text-[#064E3B] shadow-xs"
                        : "border-border bg-white text-muted-foreground hover:border-[#10B981]/50"
                    }`}
                    onClick={() => toggleSelect(r.id)}
                    data-testid={`scenario-chip-${r.id}`}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded-sm border ${
                        active ? "border-[#059669] bg-[#059669] text-white" : "border-muted-foreground"
                      }`}
                    >
                      {active && <Check className="size-3 stroke-[3]" />}
                    </div>
                    <span className="text-sm font-medium text-forest">{r.name}</span>
                    {r.is_demo && <DemoBadge label="Demo" className="text-[10px] py-0 px-1.5" />}
                    {!r.is_demo && (
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        title="Delete scenario"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete scenario "${r.name}"?`)) deleteMutation.mutate(r.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-12">
            <Panel
              className="lg:col-span-12"
              title="Side-by-side metrics table"
              subtitle="Comparing operational energy balances and cost indicators"
              testId="scenarios-comparison-table"
              action={
                <Button
                  size="sm"
                  onClick={() => compareMutation.mutate()}
                  disabled={compareMutation.isPending || activeIds.length < 2}
                  data-testid="compare-explain-button"
                  className="bg-forest text-white hover:bg-forest-2"
                >
                  <Sparkles className="size-3.5" /> {compareMutation.isPending ? "Analyzing…" : "AI trade-off analysis"}
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-56 text-xs">Metric</TableHead>
                      {selectedRuns.map((r, i) => (
                        <TableHead key={r.id} className="text-right text-xs">
                          <span className="font-semibold text-forest">{r.name}</span>
                          <span className="block text-[11px] font-normal text-muted-foreground">Scenario {i + 1}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Self-sufficiency</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono font-semibold text-[#047857]">
                          {fmt(r.summary.self_sufficiency_pct)}%
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Self-consumption</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.self_consumption_pct)}%
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Total solar generation</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.total_generation_kwh, 0)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Total demand</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.total_demand_kwh, 0)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Utility grid import</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono text-[#B91C1C]">
                          {fmt(r.summary.grid_import_kwh, 0)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Utility grid export</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono text-[#6D28D9]">
                          {fmt(r.summary.grid_export_kwh, 0)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Solar curtailment</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.curtailment_kwh, 1)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Peer-to-peer sharing</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono text-[#047857]">
                          {fmt(r.summary.p2p_shared_kwh, 1)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">DSM load shifted</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.dsm_shifted_kwh, 1)} kWh
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Battery cycling</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono">
                          {fmt(r.summary.battery_cycles, 2)} cycles/day
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Daily net cost</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono font-medium">
                          {money(r.summary.net_cost, currency)}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Estimated daily savings</TableCell>
                      {selectedRuns.map((r) => (
                        <TableCell key={r.id} className="text-right font-mono font-semibold text-[#047857]">
                          {money(r.summary.savings, currency)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Panel>

            {comparisonExp && (
              <Panel
                className="lg:col-span-12 bg-gradient-to-br from-white to-[#F2F7F2]"
                title="AI Scenario Analysis & Recommendations"
                subtitle="Engine-verified trade-offs and decision support"
                testId="scenarios-ai-explanation"
              >
                <div className="mb-3">
                  <span
                    className={
                      comparisonExp.source === "gemini"
                        ? "inline-block rounded-full bg-[#EBF5ED] px-2.5 py-0.5 text-xs font-semibold text-[#0F5132]"
                        : "inline-block rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]"
                    }
                  >
                    {comparisonExp.source === "gemini" ? "Gemini AI" : "Rule-based comparison (AI unavailable)"}
                  </span>
                </div>
                <MiniMarkdown text={comparisonExp.text} />
              </Panel>
            )}

            <Panel
              className="lg:col-span-12"
              title="Scenario visual benchmark"
              subtitle="Comparing generation, load and grid exchange across selected runs"
              testId="scenarios-bar-chart"
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#E8EEE5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
                    <Tooltip formatter={(v: number, n: string) => [`${fmt(v)} kWh`, n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Generation kWh" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Demand kWh" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Import kWh" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Export kWh" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </PageFade>
  );
}
