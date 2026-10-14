import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudRain, CloudSun, Sun, Zap } from "lucide-react";
import { AiExplainPanel } from "@/components/microgrid/AiExplainPanel";
import { DemoBadge, KpiCard, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { RunView } from "@/components/microgrid/RunView";
import { fmt, hh, WEATHER_LABEL } from "@/lib/hooks";
import type { SimRun } from "@/lib/types";

const WEATHER_ICON = {
  sunny: Sun,
  partly_cloudy: CloudSun,
  overcast: CloudSun,
  rainy: CloudRain,
};

function ForecastsBody({ run }: { run: SimRun }) {
  const f = run.result.forecast;
  const days = f.days;
  const points = f.points;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {days.map((d) => {
          const Icon = WEATHER_ICON[d.weather] ?? Sun;
          return (
            <div
              key={d.day}
              data-testid={`forecast-day-card-${d.day}`}
              className="rounded-xl border border-border bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#EBF8F2] text-[#064E3B]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-forest">Day {d.day} Outlook</h3>
                    <p className="text-xs text-muted-foreground">{d.weather_label}</p>
                  </div>
                </div>
                <DemoBadge label="Deterministic forecast" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-[#F8FAF5] p-2.5">
                  <span className="block text-[11px] font-sans text-muted-foreground">Generation</span>
                  <span className="text-base font-semibold text-[#047857]">{fmt(d.generation_kwh, 0)} kWh</span>
                </div>
                <div className="rounded-lg bg-[#F8FAF5] p-2.5">
                  <span className="block text-[11px] font-sans text-muted-foreground">Demand</span>
                  <span className="text-base font-semibold text-amber-700">{fmt(d.demand_kwh, 0)} kWh</span>
                </div>
                <div className="rounded-lg bg-[#F8FAF5] p-2.5">
                  <span className="block text-[11px] font-sans text-muted-foreground">Net energy</span>
                  <span className={`text-base font-semibold ${d.net_kwh >= 0 ? "text-[#047857]" : "text-[#B91C1C]"}`}>
                    {d.net_kwh >= 0 ? "+" : ""}{fmt(d.net_kwh, 0)} kWh
                  </span>
                </div>
                <div className="rounded-lg bg-[#F8FAF5] p-2.5">
                  <span className="block text-[11px] font-sans text-muted-foreground">Peak demand</span>
                  <span className="text-base font-semibold text-forest">
                    {hh(d.peak_demand_hour)} ({fmt(d.peak_demand_kw)} kW)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Panel
          title="48-hour generation & demand forecast"
          subtitle="Clear-sky irradiance model × weather factor with P10–P90 heuristic uncertainty bounds"
          testId="forecast-48h-chart"
          action={<DemoBadge label="Synthetic weather model" />}
        >
          <div className="h-84">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid stroke="#E8EEE5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} unit=" kW" />
                <Tooltip
                  formatter={(v: number, n: string) => [`${fmt(v)} kW`, n]}
                  labelFormatter={(l: string) => `Timeline: ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />

                {/* Solar uncertainty band (P10 to P90) */}
                <Area
                  dataKey="generation_p90"
                  name="PV upper bound (P90)"
                  fill="#10B981"
                  fillOpacity={0.15}
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="generation_kw"
                  name="Expected PV generation"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="generation_p10"
                  name="PV lower bound (P10)"
                  stroke="#059669"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />

                {/* Demand uncertainty band */}
                <Area
                  dataKey="demand_p90"
                  name="Demand upper bound (P90)"
                  fill="#F59E0B"
                  fillOpacity={0.12}
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="demand_kw"
                  name="Expected demand"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <p>
              <strong>Methodology:</strong> {f.method}. Day 2 weather variation is seeded deterministically from scenario inputs.
            </p>
            <p className="font-mono">Ready for OpenWeatherMap / Solcast API binding</p>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <AiExplainPanel run={run} topic="forecast" title="AI forecast interpretation" />
      </div>
    </>
  );
}

export default function Forecasts() {
  return (
    <PageFade>
      <PageHeader
        eyebrow="Predictive analytics"
        title="Generation & demand forecasts"
        description="48-hour forward projection with P10–P90 probabilistic uncertainty bands based on the microgrid physics model."
      />
      <RunView>{(run) => <ForecastsBody run={run} />}</RunView>
    </PageFade>
  );
}
