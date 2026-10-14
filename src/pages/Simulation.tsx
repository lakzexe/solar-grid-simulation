import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Play, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge, EmptyState, ErrorState, KpiCard, LoadingBlock, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { apiGet, apiPost } from "@/lib/api";
import { errorMessage, fmt, hh, PROFILE_LABEL, qk, useActiveRun, useActiveRunId, WEATHER_LABEL } from "@/lib/hooks";
import type { BatteryConfig, PreviewResponse, SimConfig, SimRun, Weather } from "@/lib/types";

function NumField({ label, value, onChange, testId, step = 1, min = 0, max, unit }: {
  label: string; value: number; onChange: (v: number) => void; testId: string; step?: number; min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={testId} className="text-xs text-muted-foreground">{label}{unit && <span className="ml-1 opacity-70">({unit})</span>}</Label>
      <Input
        id={testId}
        data-testid={testId}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="bg-white font-mono"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, testId, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors hover:border-[#10B981]">
      <Checkbox data-testid={testId} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-border pt-5 first:border-0 first:pt-0">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900/70">{title}</legend>
      {children}
    </fieldset>
  );
}

function validate(c: SimConfig): string | null {
  if (!c.name.trim()) return "Give the scenario a name.";
  const nums: number[] = [c.non_solar_consumers, c.daily_kwh_per_home, c.export_limit_kw, c.import_tariff, c.export_tariff,
    c.days_since_cleaning, c.panel_age_years, c.outage_start_hour, c.outage_duration_h,
    ...Object.values(c.battery), ...c.groups.flatMap((g) => [g.pv_kw_per_home, g.homes])];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return "All numeric fields need a non-negative value.";
  if (c.daily_kwh_per_home <= 0) return "Daily demand per home must be above 0.";
  if (c.battery.min_soc_pct > c.battery.initial_soc_pct) return "Initial SoC must be at or above the minimum SoC.";
  if (c.outage_start_hour > 23) return "Outage start hour must be 0–23.";
  if (c.groups.some((g) => !g.name.trim())) return "Every solar-user group needs a name.";
  return null;
}

function SimForm({ initial }: { initial: SimConfig }) {
  const qc = useQueryClient();
  const { setRunId } = useActiveRunId();
  const [c, setC] = useState<SimConfig>(initial);
  const [saved, setSaved] = useState<SimRun | null>(null);
  const set = <K extends keyof SimConfig>(k: K, v: SimConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  const setB = <K extends keyof BatteryConfig>(k: K, v: number) => setC((p) => ({ ...p, battery: { ...p.battery, [k]: v } }));
  const setG = (i: number, patch: Partial<SimConfig["groups"][number]>) =>
    setC((p) => ({ ...p, groups: p.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  const preview = useMutation({
    mutationFn: () => apiPost<PreviewResponse>("/simulations/preview", c),
    onSuccess: () => toast.success("Simulation complete (preview, not saved)"),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const save = useMutation({
    mutationFn: () => apiPost<SimRun>("/simulations", c),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: qk.runs });
      qc.setQueryData(qk.run(run.id), run);
      setRunId(run.id);
      setSaved(run);
      toast.success(`Saved run “${run.name}” and set it active`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const go = (fn: () => void) => {
    const err = validate(c);
    if (err) return void toast.error(err);
    fn();
  };
  const result = saved?.result ?? preview.data?.result;
  const busy = preview.isPending || save.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <form
        data-testid="simulation-config-form"
        onSubmit={(e) => {
          e.preventDefault();
          go(() => preview.mutate());
        }}
        className="space-y-5 rounded-xl border bg-[#FCFDFB] p-5 lg:col-span-5 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto"
      >
        <Section title="Scenario">
          <div className="space-y-1.5">
            <Label htmlFor="sim-name" className="text-xs text-muted-foreground">Scenario name</Label>
            <Input id="sim-name" data-testid="sim-name-input" value={c.name} onChange={(e) => set("name", e.target.value)} className="bg-white" />
          </div>
        </Section>

        <Section title="Solar-user groups">
          {c.groups.map((g, i) => (
            <div key={i} className="rounded-lg border bg-white p-3" data-testid={`sim-group-${i}`}>
              <div className="flex items-center gap-2">
                <Input aria-label="Group name" data-testid={`sim-group-name-${i}`} value={g.name} onChange={(e) => setG(i, { name: e.target.value })} className="h-8" />
                <Button type="button" size="icon-sm" variant="ghost" data-testid={`sim-group-remove-${i}`} disabled={c.groups.length === 1}
                  onClick={() => set("groups", c.groups.filter((_, j) => j !== i))} aria-label="Remove group">
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumField label="PV per home" unit="kWp" step={0.5} value={g.pv_kw_per_home} onChange={(v) => setG(i, { pv_kw_per_home: v })} testId={`sim-group-pv-${i}`} />
                <NumField label="Homes" value={g.homes} onChange={(v) => setG(i, { homes: Math.round(v) })} testId={`sim-group-homes-${i}`} />
              </div>
            </div>
          ))}
          {c.groups.length < 10 && (
            <Button type="button" variant="outline" size="sm" data-testid="sim-add-group-button"
              onClick={() => set("groups", [...c.groups, { name: `Group ${c.groups.length + 1}`, pv_kw_per_home: 4, homes: 5 }])}>
              <Plus className="size-4" /> Add group
            </Button>
          )}
        </Section>

        <Section title="Consumers & demand">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Non-solar consumers" value={c.non_solar_consumers} onChange={(v) => set("non_solar_consumers", Math.round(v))} testId="sim-nonsolar-input" />
            <NumField label="Daily demand / home" unit="kWh" step={0.5} value={c.daily_kwh_per_home} onChange={(v) => set("daily_kwh_per_home", v)} testId="sim-daily-kwh-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Demand profile</Label>
            <Select value={c.demand_profile} onValueChange={(v: string) => set("demand_profile", v as SimConfig["demand_profile"])}>
              <SelectTrigger data-testid="sim-demand-profile-select" className="w-full bg-white"><SelectValue>{PROFILE_LABEL[c.demand_profile]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(PROFILE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Battery storage">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Capacity" unit="kWh" value={c.battery.capacity_kwh} onChange={(v) => setB("capacity_kwh", v)} testId="sim-battery-capacity-input" />
            <NumField label="Round-trip eff." unit="%" value={c.battery.round_trip_efficiency_pct} onChange={(v) => setB("round_trip_efficiency_pct", v)} testId="sim-battery-eff-input" min={50} max={100} />
            <NumField label="Max charge" unit="kW" value={c.battery.max_charge_kw} onChange={(v) => setB("max_charge_kw", v)} testId="sim-battery-charge-input" />
            <NumField label="Max discharge" unit="kW" value={c.battery.max_discharge_kw} onChange={(v) => setB("max_discharge_kw", v)} testId="sim-battery-discharge-input" />
            <NumField label="Initial SoC" unit="%" value={c.battery.initial_soc_pct} onChange={(v) => setB("initial_soc_pct", v)} testId="sim-battery-soc-input" max={100} />
            <NumField label="Minimum SoC" unit="%" value={c.battery.min_soc_pct} onChange={(v) => setB("min_soc_pct", v)} testId="sim-battery-minsoc-input" max={90} />
          </div>
        </Section>

        <Section title="Weather & grid">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Weather condition</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {(Object.keys(WEATHER_LABEL) as Weather[]).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={c.weather === w} data-testid={`sim-weather-${w}`}
                  onClick={() => set("weather", w)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${c.weather === w ? "border-[#059669] bg-[#EBF8F2] text-[#064E3B]" : "bg-white hover:border-[#A7F3D0]"}`}>
                  {WEATHER_LABEL[w]}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Utility grid available" hint="Untick to simulate a fully islanded day" checked={c.grid_available} onChange={(v) => set("grid_available", v)} testId="sim-grid-available-checkbox" />
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Outage start" unit="h" value={c.outage_start_hour} onChange={(v) => set("outage_start_hour", Math.round(v))} testId="sim-outage-start-input" max={23} />
            <NumField label="Outage length" unit="h" value={c.outage_duration_h} onChange={(v) => set("outage_duration_h", Math.round(v))} testId="sim-outage-duration-input" max={24} />
            <NumField label="Export limit" unit="kW" value={c.export_limit_kw} onChange={(v) => set("export_limit_kw", v)} testId="sim-export-limit-input" />
          </div>
        </Section>

        <Section title="Decision strategies">
          <Toggle label="Demand-side management" hint="Shift ~12% of evening-peak flexible load into solar hours" checked={c.enable_dsm} onChange={(v) => set("enable_dsm", v)} testId="sim-dsm-checkbox" />
          <Toggle label="Peer-to-peer sharing" hint="Solar-rich homes supply neighbours before grid export" checked={c.enable_p2p} onChange={(v) => set("enable_p2p", v)} testId="sim-p2p-checkbox" />
        </Section>

        <Section title="Tariffs, panels & resilience">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Import tariff" unit="/kWh" step={0.01} value={c.import_tariff} onChange={(v) => set("import_tariff", v)} testId="sim-import-tariff-input" />
            <NumField label="Export tariff" unit="/kWh" step={0.01} value={c.export_tariff} onChange={(v) => set("export_tariff", v)} testId="sim-export-tariff-input" />
            <NumField label="Days since cleaning" value={c.days_since_cleaning} onChange={(v) => set("days_since_cleaning", Math.round(v))} testId="sim-days-cleaning-input" />
            <NumField label="Panel age" unit="years" step={0.5} value={c.panel_age_years} onChange={(v) => set("panel_age_years", v)} testId="sim-panel-age-input" />
            <NumField label="Critical load share" unit="0–1" step={0.05} value={c.critical_load_share} onChange={(v) => set("critical_load_share", v)} testId="sim-critical-share-input" max={1} />
            <NumField label="Essential load share" unit="0–1" step={0.05} value={c.essential_load_share} onChange={(v) => set("essential_load_share", v)} testId="sim-essential-share-input" max={1} />
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-[#FCFDFB]/95 p-4 backdrop-blur">
          <Button type="submit" variant="outline" className="flex-1" disabled={busy} data-testid="sim-run-preview-button">
            <Play className="size-4" /> {preview.isPending ? "Running…" : "Run preview"}
          </Button>
          <Button type="button" className="flex-1" disabled={busy} data-testid="sim-save-run-button" onClick={() => go(() => save.mutate())}>
            <Save className="size-4" /> {save.isPending ? "Saving…" : "Run & save"}
          </Button>
        </div>
      </form>

      <div className="space-y-6 lg:col-span-7">
        {saved && (
          <div data-testid="sim-save-success" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-[#064E3B]">
            <CheckCircle2 className="size-5" />
            <span className="flex-1 text-sm font-medium">“{saved.name}” saved and set as the active run.</span>
            <Link to="/energy-balance" data-testid="sim-view-balance-link" className={buttonVariants({ size: "sm", variant: "outline" })}>View energy balance</Link>
            <Link to="/" data-testid="sim-view-dashboard-link" className={buttonVariants({ size: "sm" })}>Dashboard</Link>
          </div>
        )}
        {busy && <LoadingBlock label="Running simulation engine…" className="min-h-96" />}
        {!busy && preview.isError && !result && <ErrorState message={errorMessage(preview.error)} />}
        {!busy && !result && !preview.isError && (
          <EmptyState title="Results appear here" description="Adjust parameters on the left, then Run preview to compute a 24-hour dispatch — or Run & save to keep it for comparison." />
        )}
        {!busy && result && (
          <div className="space-y-6" data-testid="sim-results">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-forest">{saved ? "Saved run results" : "Preview results"}</h2>
              <DemoBadge label="Simulated" />
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard testId="sim-result-self-sufficiency" tone="emerald" label="Self-sufficiency" value={fmt(result.summary.self_sufficiency_pct)} unit="%" />
              <KpiCard testId="sim-result-import" tone="slate" label="Grid import" value={fmt(result.summary.grid_import_kwh)} unit="kWh" />
              <KpiCard testId="sim-result-curtailment" label="Curtailed" value={fmt(result.summary.curtailment_kwh)} unit="kWh" />
              <KpiCard testId="sim-result-unserved" tone="amber" label="Unserved" value={fmt(result.summary.unserved_kwh)} unit="kWh" />
            </div>
            <Panel title="Hourly balance" subtitle="PV, demand and state of charge">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={result.hourly.map((r) => ({ ...r, label: hh(r.hour) }))} margin={{ left: -10 }}>
                    <CartesianGrid stroke="#E8EEE5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
                    <YAxis yAxisId="kw" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, n: string) => [fmt(v), n]} />
                    <Area yAxisId="kw" dataKey="generation_kw" name="PV kW" fill="#10B981" fillOpacity={0.2} stroke="#10B981" />
                    <Line yAxisId="kw" dataKey="demand_kw" name="Demand kW" stroke="#F59E0B" dot={false} strokeWidth={2} />
                    <Line yAxisId="soc" dataKey="soc_pct" name="SoC %" stroke="#0284C7" dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Decision mix" subtitle="Hours per engine decision">
              <div className="flex flex-wrap gap-2" data-testid="sim-decision-mix">
                {Object.entries(result.hourly.reduce<Record<string, number>>((a, r) => ({ ...a, [r.decision]: (a[r.decision] ?? 0) + 1 }), {})).map(([d, n]) => (
                  <span key={d} className="rounded-full border bg-[#F2F7F2] px-3 py-1 text-xs"><span className="font-mono font-semibold">{n}h</span> · {d}</span>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Simulation() {
  const defaults = useQuery({ queryKey: ["defaults"], queryFn: () => apiGet<SimConfig>("/simulations/defaults") });
  const active = useActiveRun();
  const [source, setSource] = useState<"defaults" | "active">("defaults");
  const initial = source === "active" && active.data ? { ...active.data.config, name: `${active.data.config.name} (copy)` } : defaults.data;
  return (
    <PageFade>
      <PageHeader
        eyebrow="Simulation studio"
        title="Configure the microgrid"
        description="Define solar-user groups, consumers, storage, weather and grid conditions. The Python engine computes every dispatch decision."
        actions={
          <>
            <Button variant="outline" size="sm" data-testid="sim-load-defaults-button" onClick={() => setSource("defaults")}>
              <RotateCcw className="size-3.5" /> Demo defaults
            </Button>
            <Button variant="outline" size="sm" data-testid="sim-load-active-button" disabled={!active.data} onClick={() => setSource("active")}>
              Copy active run
            </Button>
          </>
        }
      />
      {defaults.isLoading && <LoadingBlock label="Loading configuration…" />}
      {defaults.isError && <ErrorState message={errorMessage(defaults.error)} onRetry={() => defaults.refetch()} />}
      {initial && <SimForm key={`${source}-${source === "active" ? active.data?.id : "d"}`} initial={initial} />}
    </PageFade>
  );
}
