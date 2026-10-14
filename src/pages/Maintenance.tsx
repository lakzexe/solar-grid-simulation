import { AlertCircle, Calendar, CheckCircle2, ShieldCheck, Sparkles, TrendingDown, Wrench, Zap } from "lucide-react";
import { AiExplainPanel } from "@/components/microgrid/AiExplainPanel";
import { DemoBadge, KpiCard, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { RunView } from "@/components/microgrid/RunView";
import { fmt, money, useMe } from "@/lib/hooks";
import type { SimRun } from "@/lib/types";

const ALERT_SEV = {
  critical: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#78350F]",
  info: "border-[#A7F3D0] bg-[#ECFDF5] text-[#064E3B]",
};

const SEV_BADGE = {
  critical: "bg-[#FEE2E2] text-[#991B1B]",
  warning: "bg-[#FEF3C7] text-[#92400E]",
  info: "bg-[#EBF8F2] text-[#064E3B]",
};

function MaintenanceBody({ run, currency }: { run: SimRun; currency: string }) {
  const m = run.result.maintenance;
  const cfg = run.config;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          testId="maint-kpi-health"
          tone={m.health_score >= 85 ? "emerald" : m.health_score >= 70 ? "amber" : "slate"}
          label="Microgrid health score"
          value={`${m.health_score}/100`}
          hint={m.health_score >= 85 ? "Optimal operational performance" : "Maintenance attention required"}
          icon={<ShieldCheck className="size-4" />}
        />
        <KpiCard
          testId="maint-kpi-soiling"
          tone={m.soiling_loss_pct >= 5 ? "amber" : "emerald"}
          label="PV soiling loss"
          value={`${fmt(m.soiling_loss_pct)}%`}
          hint={`${cfg.days_since_cleaning} days since last clean`}
          icon={<TrendingDown className="size-4" />}
        />
        <KpiCard
          testId="maint-kpi-recovery"
          tone="amber"
          label="Recoverable revenue"
          value={money(m.cleaning_recovery_value_day, currency)}
          unit="/ day"
          hint={`${fmt(m.energy_lost_soiling_kwh_day)} kWh/day lost`}
          icon={<Zap className="size-4" />}
        />
        <KpiCard
          testId="maint-kpi-inverter"
          tone="slate"
          label="Inverter conversion"
          value={`${fmt(m.inverter_efficiency_pct)}%`}
          hint={`PV degradation ${fmt(m.degradation_pct)}% (${cfg.panel_age_years} yrs)`}
          icon={<Wrench className="size-4" />}
        />
      </div>

      <div className="mt-6">
        <div
          data-testid="maint-status-banner"
          className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${
            m.cleaning_recommended
              ? "border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]"
              : "border-[#A7F3D0] bg-[#ECFDF5] text-[#064E3B]"
          }`}
        >
          <div className="flex items-center gap-3">
            {m.cleaning_recommended ? (
              <AlertCircle className="size-6 text-[#B45309]" />
            ) : (
              <CheckCircle2 className="size-6 text-[#059669]" />
            )}
            <div>
              <h3 className="font-semibold text-forest">
                {m.cleaning_recommended
                  ? "Panel cleaning recommended immediately"
                  : "Solar panel array is operating within clean tolerances"}
              </h3>
              <p className="mt-0.5 text-xs opacity-85">
                {m.cleaning_recommended
                  ? `Soiling exceeds the 5.0% threshold. Cleaning will restore ~${fmt(
                      m.energy_lost_soiling_kwh_day
                    )} kWh/day, worth ${money(m.cleaning_recovery_value_day, currency)} daily.`
                  : `Next wash scheduled in approximately ${m.days_until_cleaning} days under current weather accumulation rates.`}
              </p>
            </div>
          </div>
          <DemoBadge label="Predictive maintenance engine" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="Diagnostic alerts & equipment health"
          subtitle="Monitored inverters, PV string degradation, battery cycling wear and curtailment"
          testId="maint-alerts-panel"
        >
          <div className="space-y-3">
            {m.alerts.map((a, i) => (
              <div
                key={i}
                data-testid={`maint-alert-item-${i}`}
                className={`rounded-xl border p-4 transition-colors ${ALERT_SEV[a.severity]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      SEV_BADGE[a.severity]
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-90 leading-relaxed">{a.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6 lg:col-span-5">
          <Panel
            title="Cleaning cycle schedule"
            subtitle="Optimal maintenance interval to maximize NPV of generation"
            testId="maint-schedule-panel"
          >
            <div className="space-y-3">
              {m.cleaning_schedule.map((slot) => (
                <div
                  key={slot.cycle}
                  className="flex items-center justify-between rounded-lg border border-border bg-[#F8FAF5] p-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-emerald-700" />
                    <div>
                      <p className="font-medium text-forest">Maintenance Cycle #{slot.cycle}</p>
                      <p className="text-xs text-muted-foreground">
                        {slot.in_days === 0 ? "Due today" : `In ~${slot.in_days} days`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-800">
                    {slot.in_days === 0 ? "Immediate" : `+${slot.in_days}d`}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Based on empirical dust accumulation models (0.28%/day dry rate; 0.22%/day rainy rate).
            </p>
          </Panel>

          <Panel title="Array physical parameters" testId="maint-specs-panel">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Installed PV</dt>
                <dd className="font-mono font-medium">{fmt(run.result.summary.installed_pv_kw, 1)} kWp</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Panel age</dt>
                <dd className="font-mono font-medium">{cfg.panel_age_years} years</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Weather state</dt>
                <dd className="font-mono font-medium capitalize">{cfg.weather.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Annual deg. rate</dt>
                <dd className="font-mono font-medium">0.50% / yr</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <AiExplainPanel run={run} topic="maintenance" title="AI maintenance briefing" />
      </div>
    </>
  );
}

export default function Maintenance() {
  const me = useMe();
  return (
    <PageFade>
      <PageHeader
        eyebrow="Asset health & maintenance"
        title="Predictive maintenance & cleaning"
        description="Monitor panel soiling losses, module degradation, inverter conversion efficiency, and automated cleaning payback schedules."
      />
      <RunView>{(run) => <MaintenanceBody run={run} currency={me.data?.currency ?? "LKR"} />}</RunView>
    </PageFade>
  );
}
