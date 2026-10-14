import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AiExplainPanel } from "@/components/microgrid/AiExplainPanel";
import { DemoBadge, KpiCard, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { RunView } from "@/components/microgrid/RunView";
import { fmt, hh } from "@/lib/hooks";
import type { SimRun } from "@/lib/types";

const DECISION_TONE: Record<string, string> = {
  "Charge battery": "bg-[#E0F2FE] text-[#075985]",
  "Charge + export": "bg-[#EDE9FE] text-[#5B21B6]",
  "Export to grid": "bg-[#EDE9FE] text-[#5B21B6]",
  "Discharge battery": "bg-[#CFFAFE] text-[#155E75]",
  "Discharge + grid import": "bg-[#FEF3C7] text-[#92400E]",
  "Import from grid": "bg-[#FEE2E2] text-[#991B1B]",
  "Curtail solar": "bg-[#F3F4F6] text-[#374151]",
  "Shed non-essential load": "bg-[#FECACA] text-[#7F1D1D]",
  Balanced: "bg-[#ECFDF5] text-[#065F46]",
};

function Body({ run }: { run: SimRun }) {
  const s = run.result.summary;
  const data = run.result.hourly.map((r) => ({
    ...r,
    label: hh(r.hour),
    discharge_neg: -r.battery_discharge_kw,
    import_neg: -r.grid_import_kw,
  }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard testId="eb-kpi-charge" label="Battery charged" value={fmt(s.battery_charge_kwh)} unit="kWh" />
        <KpiCard testId="eb-kpi-discharge" label="Battery discharged" value={fmt(s.battery_discharge_kwh)} unit="kWh" />
        <KpiCard testId="eb-kpi-p2p" tone="emerald" label="P2P shared" value={fmt(s.p2p_shared_kwh)} unit="kWh" />
        <KpiCard testId="eb-kpi-dsm" tone="emerald" label="DSM shifted" value={fmt(s.dsm_shifted_kwh)} unit="kWh" />
        <KpiCard testId="eb-kpi-export" tone="slate" label="Grid export" value={fmt(s.grid_export_kwh)} unit="kWh" />
        <KpiCard testId="eb-kpi-curtail" tone="amber" label="Curtailed" value={fmt(s.curtailment_kwh)} unit="kWh" />
      </div>

      <Panel className="mt-6" title="Dispatch decisions by hour" subtitle="Positive = energy into battery / grid; negative = energy drawn from battery / grid" testId="eb-dispatch-chart" action={<DemoBadge label="Simulated" />}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} stackOffset="sign" margin={{ left: -10 }}>
              <CartesianGrid stroke="#E8EEE5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} unit=" kW" />
              <Tooltip formatter={(v: number, n: string) => [`${fmt(Math.abs(v))} kW`, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="#9CA3AF" />
              <Bar dataKey="battery_charge_kw" name="Battery charge" stackId="s" fill="#0284C7" />
              <Bar dataKey="grid_export_kw" name="Grid export" stackId="s" fill="#8B5CF6" />
              <Bar dataKey="curtailment_kw" name="Curtailment" stackId="s" fill="#9CA3AF" />
              <Bar dataKey="discharge_neg" name="Battery discharge" stackId="s" fill="#06B6D4" />
              <Bar dataKey="import_neg" name="Grid import" stackId="s" fill="#EF4444" />
              <Line dataKey="dsm_shift_kw" name="DSM shift" stroke="#059669" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Hourly decision log" testId="eb-decision-table">
          <div className="max-h-[32rem] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  {["Hour", "PV", "Demand", "P2P", "Batt ±", "SoC", "Grid ±", "Curtail", "Decision"].map((h) => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono text-xs">
                {run.result.hourly.map((r) => {
                  const batt = r.battery_charge_kw - r.battery_discharge_kw;
                  const grid = r.grid_export_kw - r.grid_import_kw;
                  return (
                    <TableRow key={r.hour} data-testid={`eb-row-${r.hour}`} className={r.grid_available ? "" : "bg-[#FEF2F2]"}>
                      <TableCell>{hh(r.hour)}{!r.grid_available && <span className="ml-1 text-[#B91C1C]" title="Grid outage">⚡</span>}</TableCell>
                      <TableCell>{fmt(r.generation_kw)}</TableCell>
                      <TableCell>{fmt(r.demand_kw)}</TableCell>
                      <TableCell>{fmt(r.p2p_kw)}</TableCell>
                      <TableCell className={batt > 0 ? "text-[#075985]" : batt < 0 ? "text-[#0E7490]" : ""}>{batt > 0 ? "+" : ""}{fmt(batt)}</TableCell>
                      <TableCell>{fmt(r.soc_pct, 0)}%</TableCell>
                      <TableCell className={grid < 0 ? "text-[#B91C1C]" : grid > 0 ? "text-[#6D28D9]" : ""}>{grid > 0 ? "+" : ""}{fmt(grid)}</TableCell>
                      <TableCell>{fmt(r.curtailment_kw)}</TableCell>
                      <TableCell className="font-sans">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DECISION_TONE[r.decision] ?? ""}`}>{r.decision}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Values in kW (hourly average = kWh). Red rows = grid unavailable.</p>
        </Panel>
        <div className="space-y-6 xl:col-span-4">
          <Panel title="Group energy balance" subtitle="Daily kWh per solar-user group" testId="eb-group-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Group</TableHead>
                  <TableHead className="text-right text-xs">Gen</TableHead>
                  <TableHead className="text-right text-xs">Load</TableHead>
                  <TableHead className="text-right text-xs">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.result.groups.map((g) => (
                  <TableRow key={g.name}>
                    <TableCell className="max-w-[9rem] truncate text-xs" title={g.name}>{g.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(g.generation_kwh, 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(g.demand_kwh, 0)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${g.net_kwh >= 0 ? "text-[#047857]" : "text-[#B91C1C]"}`}>{fmt(g.net_kwh, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">Groups with positive net supply neighbours via P2P before exporting.</p>
          </Panel>
          <AiExplainPanel run={run} topic="energy_balance" title="Explain these decisions" />
        </div>
      </div>
    </>
  );
}

export default function EnergyBalance() {
  return (
    <PageFade>
      <PageHeader eyebrow="Energy balance & decisions" title="Hourly dispatch" description="Battery charging/discharging, demand-side management, peer-to-peer sharing, grid import/export and solar curtailment as decided by the engine." />
      <RunView>{(run) => <Body run={run} />}</RunView>
    </PageFade>
  );
}
