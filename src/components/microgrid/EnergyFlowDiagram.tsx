import { BatteryCharging, Home, Sun, UtilityPole } from "lucide-react";
import type { HourRow } from "@/lib/types";
import { fmt, hh } from "@/lib/hooks";

type Dir = 1 | -1 | 0;

function FlowLine({ d, kw, dir, color, testId }: { d: string; kw: number; dir: Dir; color: string; testId: string }) {
  const width = Math.min(7, 2 + kw / 8);
  const speed = Math.max(0.5, 2.2 - kw / 30);
  return (
    <g data-testid={testId}>
      <path d={d} fill="none" stroke="#DCE7D8" strokeWidth={width + 4} strokeLinecap="round" />
      {dir !== 0 && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray="6 6"
          className="animate-flow"
          style={{ animationDuration: `${speed}s`, animationDirection: dir === 1 ? "normal" : "reverse" }}
        />
      )}
    </g>
  );
}

function Node({ x, y, color, icon, label, value, testId }: {
  x: number; y: number; color: string; icon: React.ReactNode; label: string; value: string; testId: string;
}) {
  return (
    <g transform={`translate(${x},${y})`} data-testid={testId}>
      <circle r="34" fill={color} opacity="0.18" className="animate-pulse-ring" style={{ transformOrigin: "0 0", transformBox: "fill-box" }} />
      <circle r="30" fill="white" stroke={color} strokeWidth="2.5" />
      <foreignObject x="-12" y="-12" width="24" height="24">
        <div style={{ color }} className="flex size-6 items-center justify-center">{icon}</div>
      </foreignObject>
      <text y="50" textAnchor="middle" className="fill-[#0D2818] text-[12px] font-semibold">{label}</text>
      <text y="66" textAnchor="middle" className="fill-[#3D5845] font-mono text-[12px]">{value}</text>
    </g>
  );
}

/** Animated energy-flow topology for one simulated hour. Hub = community bus (P2P + DSM). */
export function EnergyFlowDiagram({ row }: { row: HourRow }) {
  const batt = row.battery_charge_kw > 0 ? row.battery_charge_kw : -row.battery_discharge_kw;
  const grid = row.grid_export_kw > 0 ? row.grid_export_kw : -row.grid_import_kw;
  return (
    <div className="relative rounded-xl bg-[#F2F7F2] p-2" data-testid="energy-flow-diagram">
      <svg viewBox="0 0 560 300" className="h-auto w-full" role="img" aria-label={`Energy flow at ${hh(row.hour)}`}>
        <FlowLine testId="flow-pv" d="M 100 80 C 190 80, 210 150, 280 150" kw={row.generation_kw} dir={row.generation_kw > 0.01 ? 1 : 0} color="#10B981" />
        <FlowLine testId="flow-battery" d="M 280 150 C 210 150, 190 225, 100 225" kw={Math.abs(batt)} dir={batt > 0.01 ? 1 : batt < -0.01 ? -1 : 0} color="#0284C7" />
        <FlowLine testId="flow-load" d="M 280 150 C 350 150, 370 225, 460 225" kw={row.demand_kw} dir={row.demand_kw > 0.01 ? 1 : 0} color="#F59E0B" />
        <FlowLine testId="flow-grid" d="M 280 150 C 350 150, 370 80, 460 80" kw={Math.abs(grid)} dir={grid > 0.01 ? 1 : grid < -0.01 ? -1 : 0} color={grid >= 0 ? "#8B5CF6" : "#EF4444"} />
        <g transform="translate(280,150)" data-testid="flow-node-hub">
          <rect x="-46" y="-22" width="92" height="44" rx="12" fill="#0D2818" />
          <text y="-3" textAnchor="middle" className="fill-[#34D399] text-[10px] font-semibold uppercase tracking-wider">Community bus</text>
          <text y="12" textAnchor="middle" className="fill-white font-mono text-[11px]">P2P {fmt(row.p2p_kw)} kW</text>
        </g>
        <Node testId="flow-node-pv" x={100} y={80} color="#059669" icon={<Sun className="size-5" />} label="PV arrays" value={`${fmt(row.generation_kw)} kW`} />
        <Node testId="flow-node-battery" x={100} y={225} color="#0284C7" icon={<BatteryCharging className="size-5" />} label={`Battery · ${fmt(row.soc_pct, 0)}%`}
          value={batt > 0 ? `+${fmt(batt)} kW` : batt < 0 ? `${fmt(batt)} kW` : "Idle"} />
        <Node testId="flow-node-load" x={460} y={225} color="#D97706" icon={<Home className="size-5" />} label="Homes" value={`${fmt(row.demand_kw)} kW`} />
        <Node testId="flow-node-grid" x={460} y={80} color={row.grid_available ? "#4B5563" : "#B91C1C"} icon={<UtilityPole className="size-5" />}
          label={row.grid_available ? "Utility grid" : "Grid outage"}
          value={grid > 0 ? `Export ${fmt(grid)}` : grid < 0 ? `Import ${fmt(-grid)}` : "0.0 kW"} />
      </svg>
      {row.curtailment_kw > 0.01 && (
        <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6B7280] shadow-sm">
          Curtailed {fmt(row.curtailment_kw)} kW
        </span>
      )}
      {row.unserved_kw > 0.01 && (
        <span className="absolute right-3 top-3 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#991B1B]">
          Unserved {fmt(row.unserved_kw)} kW
        </span>
      )}
    </div>
  );
}
