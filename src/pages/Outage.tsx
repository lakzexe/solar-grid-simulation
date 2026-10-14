import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BatteryWarning, CheckCircle, Clock, Lightbulb, Play, ShieldAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiExplainPanel } from "@/components/microgrid/AiExplainPanel";
import { DemoBadge, KpiCard, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { RunView } from "@/components/microgrid/RunView";
import { apiPost } from "@/lib/api";
import { errorMessage, fmt, hh, WEATHER_LABEL } from "@/lib/hooks";
import type { OutageRequest, OutageResult, SimRun, Weather } from "@/lib/types";

function OutageBody({ run }: { run: SimRun }) {
  const o = run.result.outage;
  const cfg = run.config;
  const avgLoad = run.result.summary.total_demand_kwh / 24;

  const [activeOutage, setActiveOutage] = useState<OutageResult>(o);

  // What-if simulator state
  const [startHour, setStartHour] = useState(cfg.outage_start_hour || 18);
  const [battKwh, setBattKwh] = useState(cfg.battery.capacity_kwh);
  const [initSoc, setInitSoc] = useState(cfg.battery.initial_soc_pct);
  const [minSoc, setMinSoc] = useState(cfg.battery.min_soc_pct);
  const [loadKw, setLoadKw] = useState(Math.round(avgLoad * 10) / 10);
  const [weather, setWeather] = useState<Weather>(cfg.weather);

  const simulateMutation = useMutation({
    mutationFn: () =>
      apiPost<OutageResult>("/engine/outage", {
        battery_kwh: battKwh,
        soc_pct: initSoc,
        min_soc_pct: minSoc,
        load_kw: loadKw,
        critical_share: cfg.critical_load_share,
        essential_share: cfg.essential_load_share,
        start_hour: startHour,
        pv_kw: run.result.summary.installed_pv_kw,
        weather,
      } as OutageRequest),
    onSuccess: (data) => {
      setActiveOutage(data);
      toast.success("Outage simulation recalculated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Prepare 72-hour trace chart data
  const maxPoints = Math.max(...activeOutage.tiers.map((t) => t.soc_trace.length), 24);
  const chartData = Array.from({ length: maxPoints }).map((_, i) => {
    const point: Record<string, number | string> = {
      hour: `+${i}h (${hh((activeOutage.start_hour + i) % 24)})`,
    };
    activeOutage.tiers.forEach((t) => {
      if (i < t.soc_trace.length) {
        point[t.label] = t.soc_trace[i];
      }
    });
    return point;
  });

  const fullTier = activeOutage.tiers.find((t) => t.key === "full");
  const essTier = activeOutage.tiers.find((t) => t.key === "essential");
  const critTier = activeOutage.tiers.find((t) => t.key === "critical");

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          data-testid="outage-tier-full"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-[#991B1B] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#991B1B]">Full household load</span>
            <Clock className="size-4 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold">
              {fullTier?.survives_72h ? "72 h+" : `${fmt(fullTier?.survival_hours ?? 0)}`}
            </span>
            <span className="text-sm font-semibold">{fullTier?.survives_72h ? "" : "hours"}</span>
          </div>
          <p className="mt-2 text-xs opacity-90">100% consumption (all circuits active)</p>
        </div>

        <div
          data-testid="outage-tier-essential"
          className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-[#92400E] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#92400E]">Essential load tier</span>
            <Clock className="size-4 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold">
              {essTier?.survives_72h ? "72 h+" : `${fmt(essTier?.survival_hours ?? 0)}`}
            </span>
            <span className="text-sm font-semibold">{essTier?.survives_72h ? "" : "hours"}</span>
          </div>
          <p className="mt-2 text-xs opacity-90">
            {Math.round(cfg.essential_load_share * 100)}% load (fridges, lighting, routers, pumps deferred)
          </p>
        </div>

        <div
          data-testid="outage-tier-critical"
          className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-5 text-[#065F46] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#065F46]">Critical life-safety</span>
            <Clock className="size-4 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold">
              {critTier?.survives_72h ? "72 h+" : `${fmt(critTier?.survival_hours ?? 0)}`}
            </span>
            <span className="text-sm font-semibold">{critTier?.survives_72h ? "" : "hours"}</span>
          </div>
          <p className="mt-2 text-xs opacity-90">
            {Math.round(cfg.critical_load_share * 100)}% load (medical, basic lighting & comms)
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title="72-hour battery state-of-charge decay curve"
          subtitle={`Simulated from ${hh(activeOutage.start_hour)} blackout with solar daytime recharging`}
          testId="outage-decay-chart"
          action={<DemoBadge label="Physics backup model" />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -15, right: 10, top: 10 }}>
                <CartesianGrid stroke="#E8EEE5" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number, n: string) => [`${fmt(v)}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Full household load"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Essential loads only"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Critical loads only"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Recharge occurs when solar irradiance exceeds instantaneous load. Usable reserve buffer:{" "}
            <strong>{fmt(activeOutage.usable_energy_kwh, 1)} kWh</strong>.
          </p>
        </Panel>

        <Panel
          className="lg:col-span-4"
          title="Interactive what-if simulator"
          subtitle="Test custom blackout conditions"
          testId="outage-simulator-panel"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              simulateMutation.mutate();
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="outage-start" className="text-xs text-muted-foreground">
                  Start hour
                </Label>
                <Input
                  id="outage-start"
                  data-testid="outage-start-input"
                  type="number"
                  min={0}
                  max={23}
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="outage-capacity" className="text-xs text-muted-foreground">
                  Battery (kWh)
                </Label>
                <Input
                  id="outage-capacity"
                  data-testid="outage-capacity-input"
                  type="number"
                  min={10}
                  max={2000}
                  value={battKwh}
                  onChange={(e) => setBattKwh(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="outage-soc" className="text-xs text-muted-foreground">
                  Start SoC (%)
                </Label>
                <Input
                  id="outage-soc"
                  data-testid="outage-soc-input"
                  type="number"
                  min={10}
                  max={100}
                  value={initSoc}
                  onChange={(e) => setInitSoc(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="outage-load" className="text-xs text-muted-foreground">
                  Mean load (kW)
                </Label>
                <Input
                  id="outage-load"
                  data-testid="outage-load-input"
                  type="number"
                  step={0.5}
                  min={1}
                  value={loadKw}
                  onChange={(e) => setLoadKw(Number(e.target.value))}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Weather state</Label>
              <Select value={weather} onValueChange={(v) => setWeather(v as Weather)}>
                <SelectTrigger data-testid="outage-weather-select" className="h-8 text-xs bg-white">
                  <SelectValue>{WEATHER_LABEL[weather]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WEATHER_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={simulateMutation.isPending}
              data-testid="outage-calculate-button"
              className="w-full mt-2"
            >
              <Play className="size-3.5" />
              {simulateMutation.isPending ? "Computing…" : "Recalculate survival"}
            </Button>
          </form>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title="Emergency load-shedding playbook"
          subtitle="Engine recommendations to maximize critical survival duration"
          testId="outage-recommendations-panel"
        >
          <ul className="space-y-3">
            {activeOutage.recommendations.map((rec, i) => (
              <li
                key={i}
                data-testid={`outage-recommendation-${i}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-[#F8FAF5] p-3.5 text-sm"
              >
                <Lightbulb className="size-5 shrink-0 text-amber-600 mt-0.5" />
                <span className="leading-relaxed text-[#2A3F31]">{rec}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="lg:col-span-4">
          <AiExplainPanel run={run} topic="outage" title="AI resilience advisor" />
        </div>
      </div>
    </>
  );
}

export default function Outage() {
  return (
    <PageFade>
      <PageHeader
        eyebrow="Resilience & emergency dispatch"
        title="Grid outage battery survival"
        description="Estimate hours of autonomy across full, essential, and critical load tiers with load-shedding strategies."
      />
      <RunView>{(run) => <OutageBody run={run} />}</RunView>
    </PageFade>
  );
}
