import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BatteryCharging, CircleDollarSign, Gauge, PlugZap, Sun } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buttonVariants } from "@/components/ui/button";
import { AiExplainPanel } from "@/components/microgrid/AiExplainPanel";
import { DemoBadge, KpiCard, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { EnergyFlowDiagram } from "@/components/microgrid/EnergyFlowDiagram";
import { RunView } from "@/components/microgrid/RunView";
import { fmt, hh, money, useMe, WEATHER_LABEL } from "@/lib/hooks";
import type { SimRun } from "@/lib/types";

const SEV = {
  critical: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#78350F]",
  info: "border-[#A7F3D0] bg-[#ECFDF5] text-[#064E3B]",
};

function DashboardBody({ run, currency }: { run: SimRun; currency: string }) {
  const [hour, setHour] = useState(12);
  const s = run.result.summary;
  const row = run.result.hourly[hour] ?? run.result.hourly[0];
  const out = run.result.outage;
  const chart = run.result.hourly.map((r) => ({ ...r, label: hh(r.hour) }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard testId="kpi-self-sufficiency" tone="emerald" label="Self-sufficiency" value={fmt(s.self_sufficiency_pct)} unit="%" hint={`${fmt(s.total_demand_kwh, 0)} kWh demand served`} icon={<Gauge className="size-4" />} />
        <KpiCard testId="kpi-generation" label="PV generation" value={fmt(s.total_generation_kwh, 0)} unit="kWh" hint={`${fmt(s.installed_pv_kw, 0)} kWp · ${WEATHER_LABEL[run.config.weather]}`} icon={<Sun className="size-4" />} />
        <KpiCard testId="kpi-grid" tone="slate" label="Grid import / export" value={`${fmt(s.grid_import_kwh, 0)} / ${fmt(s.grid_export_kwh, 0)}`} unit="kWh" hint={`Peak import ${fmt(s.peak_import_kw)} kW`} icon={<PlugZap className="size-4" />} />
        <KpiCard testId="kpi-savings" tone="amber" label="Daily savings" value={money(s.savings, currency)} hint={`vs. ${money(s.baseline_cost, currency)} grid-only`} icon={<CircleDollarSign className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel
          testId="dashboard-flow-panel"
          className="lg:col-span-8"
          title="Energy-flow topology"
          subtitle={`Simulated hour ${hh(hour)} · decision: ${row.decision}`}
          action={<DemoBadge label="Simulated feed" />}
        >
          <EnergyFlowDiagram row={row} />
          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="hour" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hour</label>
            <input
              id="hour"
              data-testid="dashboard-hour-slider"
              type="range"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="flex-1 accent-[#059669]"
              aria-label="Simulated hour"
            />
            <span className="w-14 text-right font-mono text-sm" data-testid="dashboard-hour-value">{hh(hour)}</span>
          </div>
        </Panel>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel title="Battery state" testId="dashboard-battery-panel">
            <div className="flex items-end justify-between">
              <span className="font-mono text-4xl font-semibold text-forest" data-testid="dashboard-soc-value">{fmt(row.soc_pct, 0)}%</span>
              <BatteryCharging className="size-6 text-battery" />
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-[#E4EBE0]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0284C7] to-[#06B6D4] transition-[width] duration-500" style={{ width: `${row.soc_pct}%` }} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Capacity</dt><dd className="font-mono">{fmt(run.config.battery.capacity_kwh, 0)} kWh</dd></div>
              <div><dt className="text-muted-foreground">Reserve floor</dt><dd className="font-mono">{fmt(run.config.battery.min_soc_pct, 0)}%</dd></div>
              <div><dt className="text-muted-foreground">Cycles / day</dt><dd className="font-mono">{fmt(s.battery_cycles, 2)}</dd></div>
              <div><dt className="text-muted-foreground">P2P shared</dt><dd className="font-mono">{fmt(s.p2p_shared_kwh)} kWh</dd></div>
            </dl>
          </Panel>
          <Panel title="Outage watch" testId="dashboard-outage-panel" action={<Link to="/outage" data-testid="dashboard-outage-link" className="text-xs font-semibold text-primary hover:underline">Details</Link>}>
            <ul className="space-y-2">
              {out.tiers.map((t) => (
                <li key={t.key} className="flex items-center justify-between text-sm">
                  <span>{t.label}</span>
                  <span className="font-mono font-semibold" data-testid={`dashboard-outage-${t.key}`}>
                    {t.survives_72h ? "72 h+" : `${fmt(t.survival_hours)} h`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Outage assumed from {hh(out.start_hour)}.</p>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title="24 h dispatch profile" subtitle="Generation vs demand with battery state of charge" testId="dashboard-dispatch-chart">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ left: -10, right: 0, top: 5 }}>
                <CartesianGrid stroke="#E8EEE5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
                <YAxis yAxisId="kw" tick={{ fontSize: 11 }} unit=" kW" />
                <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number, n: string) => [`${fmt(v)}${n === "SoC" ? "%" : " kW"}`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="kw" type="monotone" dataKey="generation_kw" name="PV generation" fill="#10B981" fillOpacity={0.22} stroke="#10B981" strokeWidth={2} />
                <Line yAxisId="kw" type="monotone" dataKey="demand_kw" name="Demand" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line yAxisId="kw" type="monotone" dataKey="grid_import_kw" name="Grid import" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line yAxisId="soc" type="monotone" dataKey="soc_pct" name="SoC" stroke="#0284C7" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="lg:col-span-4" title="Active alerts" testId="dashboard-alerts-panel" action={<Link to="/maintenance" data-testid="dashboard-maintenance-link" className="text-xs font-semibold text-primary hover:underline">Maintenance</Link>}>
          <ul className="space-y-2">
            {run.result.maintenance.alerts.slice(0, 4).map((a) => (
              <li key={a.title} className={`rounded-lg border p-3 text-sm ${SEV[a.severity]}`} data-testid="dashboard-alert-item">
                <p className="font-semibold">{a.title}</p>
                <p className="mt-0.5 text-xs opacity-90">{a.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-6">
        <AiExplainPanel run={run} topic="overview" title="AI run overview" />
      </div>
    </>
  );
}

export default function Dashboard() {
  const me = useMe();
  return (
    <PageFade>
      <PageHeader
        eyebrow="Control center"
        title="Microgrid dashboard"
        description="Daily energy balance, dispatch decisions and resilience for the selected simulation run."
        actions={
          <Link to="/simulation" data-testid="dashboard-new-sim-button" className={buttonVariants()}>
            New simulation <ArrowRight className="size-4" />
          </Link>
        }
      />
      <RunView>{(run) => <DashboardBody run={run} currency={me.data?.currency ?? "LKR"} />}</RunView>
    </PageFade>
  );
}
