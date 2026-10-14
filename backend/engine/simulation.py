"""SolarGrid AI simulation & decision engine.

Pure, deterministic Python: every operational number shown in the UI is computed here.
The AI layer only *explains* these results; it never produces them.
Inputs are plain dicts matching models.sim.SimConfig.
"""

from __future__ import annotations

import hashlib
import math
import random

HOURS = list(range(24))

WEATHER_FACTOR = {"sunny": 1.0, "partly_cloudy": 0.68, "overcast": 0.34, "rainy": 0.17}
WEATHER_UNCERTAINTY = {"sunny": 0.08, "partly_cloudy": 0.2, "overcast": 0.3, "rainy": 0.35}
WEATHER_LABEL = {"sunny": "Sunny", "partly_cloudy": "Partly cloudy", "overcast": "Overcast", "rainy": "Rainy"}

# Hourly demand shapes (relative weights, normalised below).
_PROFILES = {
    "residential": [3, 2.6, 2.4, 2.4, 2.6, 3.4, 4.8, 5.6, 5, 4, 3.6, 3.6, 3.8, 3.6, 3.4, 3.6, 4.4, 5.8, 7.4, 8, 7.4, 6, 4.6, 3.6],
    "evening_peak": [2.6, 2.2, 2, 2, 2.2, 2.8, 3.6, 4.2, 3.4, 2.8, 2.6, 2.6, 2.8, 2.6, 2.6, 3, 4.2, 6.6, 9, 9.6, 8.6, 6.8, 4.8, 3.4],
    "daytime_home": [2.8, 2.4, 2.2, 2.2, 2.4, 3, 4, 4.8, 5.2, 5.4, 5.6, 5.8, 6, 5.8, 5.4, 5.2, 5.2, 5.6, 6.2, 6.4, 5.8, 4.8, 3.8, 3.2],
    "flat": [1] * 24,
}
PROFILES = {k: [v / sum(w) for v in w] for k, w in _PROFILES.items()}

PERFORMANCE_RATIO = 0.8
DSM_FLEX_SHARE = 0.12  # share of evening-peak load that is deferrable (washing, pumping, EV top-up)
EVENING_PEAK = range(17, 22)
SOLAR_WINDOW = range(10, 16)


def irradiance_shape(h: float) -> float:
    """Clear-sky normalised irradiance (0..1) with sunrise 6:00, sunset 18:30."""
    if h < 6 or h > 18.5:
        return 0.0
    return max(0.0, math.sin(math.pi * (h - 6) / 12.5)) ** 1.3


def soiling_loss(days_since_cleaning: int, weather: str) -> float:
    rate = 0.0022 if weather in ("rainy",) else 0.0028
    return min(0.25, days_since_cleaning * rate)


def degradation_loss(panel_age_years: float) -> float:
    return min(0.3, 0.005 * panel_age_years)


def _r(x: float, n: int = 2) -> float:
    return round(x, n)


def _seed(cfg: dict) -> int:
    return int(hashlib.sha256(repr(sorted(cfg.items())).encode()).hexdigest()[:8], 16)


def generation_profile(cfg: dict, weather: str | None = None) -> tuple[list[float], dict[str, list[float]]]:
    weather = weather or cfg["weather"]
    derate = (1 - soiling_loss(cfg["days_since_cleaning"], weather)) * (1 - degradation_loss(cfg["panel_age_years"]))
    wf = WEATHER_FACTOR[weather]
    per_group: dict[str, list[float]] = {}
    for g in cfg["groups"]:
        kw = g["pv_kw_per_home"] * g["homes"]
        per_group[g["name"]] = [kw * irradiance_shape(h + 0.5) * wf * PERFORMANCE_RATIO * derate for h in HOURS]
    total = [sum(v[h] for v in per_group.values()) for h in HOURS]
    return total, per_group


def demand_profile(cfg: dict) -> tuple[list[float], dict[str, list[float]]]:
    shape = PROFILES[cfg["demand_profile"]]
    per_group: dict[str, list[float]] = {}
    for g in cfg["groups"]:
        per_group[g["name"]] = [cfg["daily_kwh_per_home"] * g["homes"] * s for s in shape]
    per_group["Non-solar consumers"] = [cfg["daily_kwh_per_home"] * cfg["non_solar_consumers"] * s for s in shape]
    total = [sum(v[h] for v in per_group.values()) for h in HOURS]
    return total, per_group


def apply_dsm(demand: list[float], gen: list[float]) -> tuple[list[float], list[float]]:
    """Shift a flexible share of evening-peak load into the solar window, weighted by PV output."""
    shifted = [0.0] * 24
    flex = sum(demand[h] * DSM_FLEX_SHARE for h in EVENING_PEAK)
    weights = [gen[h] for h in SOLAR_WINDOW]
    if flex <= 0 or sum(weights) <= 0:
        return demand[:], shifted
    surplus_capacity = sum(max(0.0, gen[h] - demand[h]) for h in SOLAR_WINDOW)
    flex = min(flex, surplus_capacity) if surplus_capacity > 0 else flex * 0.3
    new = demand[:]
    peak_total = sum(demand[h] for h in EVENING_PEAK)
    for h in EVENING_PEAK:
        cut = flex * demand[h] / peak_total
        new[h] -= cut
        shifted[h] = -cut
    for i, h in enumerate(SOLAR_WINDOW):
        add = flex * weights[i] / sum(weights)
        new[h] += add
        shifted[h] = add
    return new, shifted


def _outage_hours(cfg: dict) -> set[int]:
    if not cfg["grid_available"]:
        return set(HOURS)
    if cfg["outage_duration_h"] <= 0:
        return set()
    return {(cfg["outage_start_hour"] + i) % 24 for i in range(cfg["outage_duration_h"])}


def dispatch(cfg: dict) -> dict:
    gen, gen_groups = generation_profile(cfg)
    base_demand, dem_groups = demand_profile(cfg)
    demand, dsm_shift = apply_dsm(base_demand, gen) if cfg["enable_dsm"] else (base_demand[:], [0.0] * 24)
    b = cfg["battery"]
    cap = b["capacity_kwh"]
    eff = math.sqrt(b["round_trip_efficiency_pct"] / 100)  # one-way efficiency
    soc_kwh = cap * b["initial_soc_pct"] / 100
    min_kwh = cap * b["min_soc_pct"] / 100
    outage = _outage_hours(cfg)
    dem_scale = [demand[h] / base_demand[h] if base_demand[h] else 1 for h in HOURS]

    rows = []
    for h in HOURS:
        grid_up = h not in outage
        # Peer-to-peer: surplus from solar groups covers deficits of other groups / non-solar homes.
        surplus = deficit = 0.0
        for name, d in dem_groups.items():
            net_g = gen_groups.get(name, [0.0] * 24)[h] - d[h] * dem_scale[h]
            if net_g > 0:
                surplus += net_g
            else:
                deficit += -net_g
        p2p = min(surplus, deficit) if cfg["enable_p2p"] else 0.0

        net = gen[h] - demand[h]
        charge = discharge = g_import = g_export = curtail = unserved = 0.0
        if net >= 0:
            room = max(0.0, (cap - soc_kwh) / eff)
            charge = min(net, b["max_charge_kw"], room)
            soc_kwh += charge * eff
            rest = net - charge
            if grid_up:
                g_export = min(rest, cfg["export_limit_kw"])
                rest -= g_export
            curtail = rest
        else:
            need = -net
            avail = max(0.0, (soc_kwh - min_kwh) * eff)
            discharge = min(need, b["max_discharge_kw"], avail)
            soc_kwh -= discharge / eff if eff else 0
            rest = need - discharge
            if grid_up:
                g_import = rest
            else:
                unserved = rest
        soc_pct = 100 * soc_kwh / cap if cap else 0.0

        if unserved > 0.01:
            decision = "Shed non-essential load"
        elif discharge > 0.01 and g_import > 0.01:
            decision = "Discharge + grid import"
        elif discharge > 0.01:
            decision = "Discharge battery"
        elif g_import > 0.01:
            decision = "Import from grid"
        elif curtail > 0.01:
            decision = "Curtail solar"
        elif g_export > 0.01 and charge > 0.01:
            decision = "Charge + export"
        elif g_export > 0.01:
            decision = "Export to grid"
        elif charge > 0.01:
            decision = "Charge battery"
        else:
            decision = "Balanced"
        rows.append({
            "hour": h,
            "generation_kw": _r(gen[h]),
            "demand_kw": _r(demand[h]),
            "base_demand_kw": _r(base_demand[h]),
            "dsm_shift_kw": _r(dsm_shift[h]),
            "p2p_kw": _r(p2p),
            "battery_charge_kw": _r(charge),
            "battery_discharge_kw": _r(discharge),
            "soc_pct": _r(soc_pct, 1),
            "grid_import_kw": _r(g_import),
            "grid_export_kw": _r(g_export),
            "curtailment_kw": _r(curtail),
            "unserved_kw": _r(unserved),
            "grid_available": grid_up,
            "decision": decision,
        })

    s = lambda k: sum(r[k] for r in rows)  # noqa: E731
    total_gen, total_dem = s("generation_kw"), s("demand_kw")
    imp, exp, cur = s("grid_import_kw"), s("grid_export_kw"), s("curtailment_kw")
    unserved = s("unserved_kw")
    served_locally = total_dem - imp - unserved
    cost = imp * cfg["import_tariff"] - exp * cfg["export_tariff"]
    baseline = sum(base_demand) * cfg["import_tariff"]
    summary = {
        "total_generation_kwh": _r(total_gen),
        "total_demand_kwh": _r(total_dem),
        "self_sufficiency_pct": _r(100 * served_locally / total_dem if total_dem else 0, 1),
        "self_consumption_pct": _r(100 * (total_gen - exp - cur) / total_gen if total_gen else 0, 1),
        "grid_import_kwh": _r(imp),
        "grid_export_kwh": _r(exp),
        "curtailment_kwh": _r(cur),
        "p2p_shared_kwh": _r(s("p2p_kw")),
        "dsm_shifted_kwh": _r(sum(max(0.0, x) for x in dsm_shift)),
        "battery_charge_kwh": _r(s("battery_charge_kw")),
        "battery_discharge_kwh": _r(s("battery_discharge_kw")),
        "battery_cycles": _r(s("battery_discharge_kw") / cap if cap else 0, 2),
        "min_soc_pct": _r(min(r["soc_pct"] for r in rows), 1),
        "final_soc_pct": rows[-1]["soc_pct"],
        "unserved_kwh": _r(unserved),
        "peak_import_kw": _r(max(r["grid_import_kw"] for r in rows)),
        "net_cost": _r(cost),
        "baseline_cost": _r(baseline),
        "savings": _r(baseline - cost),
        "installed_pv_kw": _r(sum(g["pv_kw_per_home"] * g["homes"] for g in cfg["groups"])),
        "total_homes": sum(g["homes"] for g in cfg["groups"]) + cfg["non_solar_consumers"],
    }
    groups = []
    for name, d in dem_groups.items():
        gl = gen_groups.get(name, [0.0] * 24)
        groups.append({
            "name": name,
            "generation_kwh": _r(sum(gl)),
            "demand_kwh": _r(sum(d)),
            "net_kwh": _r(sum(gl) - sum(d)),
        })
    return {"hourly": rows, "summary": summary, "groups": groups}


def outage_survival(battery_kwh: float, soc_pct: float, min_soc_pct: float, load_kw: float,
                    critical_share: float, essential_share: float, start_hour: int,
                    pv_kw: float, weather: str, efficiency_pct: float = 92) -> dict:
    """Hour-by-hour battery survival for full / essential / critical load tiers (cap 72 h)."""
    eff = math.sqrt(efficiency_pct / 100)
    shape = PROFILES["residential"]
    mean_shape = sum(shape) / 24
    tiers = []
    for key, label, share in (("full", "Full household load", 1.0),
                              ("essential", "Essential loads only", essential_share),
                              ("critical", "Critical loads only", critical_share)):
        soc = battery_kwh * soc_pct / 100
        floor = battery_kwh * min_soc_pct / 100
        hours = 0.0
        trace = []
        for i in range(72):
            h = (start_hour + i) % 24
            load = load_kw * share * shape[h] / mean_shape
            pv = pv_kw * irradiance_shape(h + 0.5) * WEATHER_FACTOR[weather] * PERFORMANCE_RATIO
            net = pv - load
            if net >= 0:
                soc = min(battery_kwh, soc + net * eff)
                hours += 1
            else:
                avail = (soc - floor) * eff
                if avail >= -net:
                    soc -= -net / eff
                    hours += 1
                else:
                    hours += max(0.0, avail / -net)
                    soc = floor
                    trace.append(_r(100 * soc / battery_kwh if battery_kwh else 0, 1))
                    break
            trace.append(_r(100 * soc / battery_kwh if battery_kwh else 0, 1))
        tiers.append({"key": key, "label": label, "load_share": share, "survival_hours": _r(hours, 1),
                      "survives_72h": hours >= 72, "soc_trace": trace})
    full = tiers[0]["survival_hours"]
    recs = []
    if full < 6:
        recs.append("Switch to essential-loads mode immediately: full-load backup lasts under 6 hours.")
    recs.append(f"Defer washing machines, water pumps and EV charging until solar hours (10:00–15:00) — "
                f"essential-only mode extends backup to {tiers[1]['survival_hours']} h.")
    recs.append("Avoid electric water heaters, irons and kettles during the outage; they draw 1.5–3 kW each.")
    if weather in ("overcast", "rainy"):
        recs.append("Low solar recharge expected under current weather — keep critical loads (fridge, lighting, "
                    "router, medical devices) as the only active circuits after dusk.")
    if soc_pct < 60:
        recs.append("Battery starts the outage below 60% SoC: raise the reserve buffer in normal operation "
                    "to improve resilience.")
    recs.append("Use LED lighting and turn off idle chargers/standby devices to trim 5–10% of base load.")
    return {"tiers": tiers, "recommendations": recs, "start_hour": start_hour,
            "usable_energy_kwh": _r(max(0.0, battery_kwh * (soc_pct - min_soc_pct) / 100), 2)}


def maintenance(cfg: dict, summary: dict) -> dict:
    soil = soiling_loss(cfg["days_since_cleaning"], cfg["weather"])
    deg = degradation_loss(cfg["panel_age_years"])
    ideal = summary["total_generation_kwh"] / max(1e-6, (1 - soil))
    lost_soil = ideal - summary["total_generation_kwh"]
    recovery_value = lost_soil * cfg["import_tariff"]
    days_to_threshold = max(0, math.ceil((0.05 - soil) / 0.0028)) if soil < 0.05 else 0
    inverter_eff = _r(97.5 - 0.15 * cfg["panel_age_years"] - (1.2 if summary["curtailment_kwh"] > 5 else 0), 1)
    alerts = []
    if soil >= 0.08:
        alerts.append({"severity": "critical", "title": "Panel cleaning overdue",
                       "detail": f"Estimated soiling loss {soil*100:.1f}% — about {lost_soil:.1f} kWh/day lost."})
    elif soil >= 0.05:
        alerts.append({"severity": "warning", "title": "Panel cleaning recommended",
                       "detail": f"Soiling loss {soil*100:.1f}% exceeds the 5% cleaning threshold."})
    else:
        alerts.append({"severity": "info", "title": "Panels within cleanliness threshold",
                       "detail": f"Next cleaning predicted in ~{days_to_threshold} days."})
    if deg >= 0.08:
        alerts.append({"severity": "warning", "title": "Module degradation above 8%",
                       "detail": "Schedule an IV-curve test and inspect for hot spots / delamination."})
    if inverter_eff < 96:
        alerts.append({"severity": "warning", "title": "Inverter efficiency trending low",
                       "detail": f"Estimated conversion efficiency {inverter_eff}% — check cooling and firmware."})
    b = cfg["battery"]
    if summary["battery_cycles"] > 0.9:
        alerts.append({"severity": "warning", "title": "High battery cycling",
                       "detail": f"{summary['battery_cycles']} cycles/day accelerates wear — consider raising min SoC."})
    if b["min_soc_pct"] < 15:
        alerts.append({"severity": "warning", "title": "Deep discharge setting",
                       "detail": "Minimum SoC under 15% shortens lithium battery life."})
    if summary["curtailment_kwh"] > 0.1 * max(1, summary["total_generation_kwh"]):
        alerts.append({"severity": "info", "title": "Significant solar curtailment",
                       "detail": "Consider more storage, DSM, or a higher export limit."})
    cleaning_schedule = []
    for i, gap in enumerate((0 if soil >= 0.05 else days_to_threshold, 21, 21, 21)):
        offset = sum([0 if soil >= 0.05 else days_to_threshold, 21, 21, 21][: i + 1]) if i else gap
        cleaning_schedule.append({"cycle": i + 1, "in_days": offset})
    return {
        "soiling_loss_pct": _r(soil * 100, 1),
        "degradation_pct": _r(deg * 100, 1),
        "inverter_efficiency_pct": inverter_eff,
        "energy_lost_soiling_kwh_day": _r(lost_soil),
        "cleaning_recovery_value_day": _r(recovery_value),
        "cleaning_recommended": soil >= 0.05,
        "days_until_cleaning": days_to_threshold,
        "health_score": int(max(0, min(100, 100 - soil * 250 - deg * 120 - max(0, 97.5 - inverter_eff) * 4))),
        "alerts": alerts,
        "cleaning_schedule": cleaning_schedule,
    }


def forecast(cfg: dict) -> dict:
    """48 h generation / demand forecast with P10–P90 bands (day 2 weather drawn deterministically)."""
    rng = random.Random(_seed({k: v for k, v in cfg.items() if k != "name"}))
    order = ["sunny", "partly_cloudy", "overcast", "rainy"]
    i = order.index(cfg["weather"])
    day2 = order[max(0, min(3, i + rng.choice([-1, 0, 0, 1])))]
    dem, _ = demand_profile(cfg)
    points = []
    for day, w in ((1, cfg["weather"]), (2, day2)):
        gen, _ = generation_profile(cfg, w)
        u = WEATHER_UNCERTAINTY[w] * (1 if day == 1 else 1.4)
        for h in HOURS:
            noise = 1 + rng.uniform(-0.04, 0.04)
            d = dem[h] * noise
            g = gen[h] * (1 + rng.uniform(-0.03, 0.03))
            points.append({
                "t": (day - 1) * 24 + h, "label": f"D{day} {h:02d}:00", "weather": w,
                "generation_kw": _r(g), "generation_p10": _r(g * (1 - u)), "generation_p90": _r(g * (1 + u * 0.6)),
                "demand_kw": _r(d), "demand_p10": _r(d * 0.9), "demand_p90": _r(d * 1.12),
            })
    days = []
    for day, w in ((1, cfg["weather"]), (2, day2)):
        pts = [p for p in points if (p["t"] // 24) + 1 == day]
        g, d = sum(p["generation_kw"] for p in pts), sum(p["demand_kw"] for p in pts)
        peak = max(pts, key=lambda p: p["demand_kw"])
        days.append({"day": day, "weather": w, "weather_label": WEATHER_LABEL[w], "generation_kwh": _r(g),
                     "demand_kwh": _r(d), "net_kwh": _r(g - d), "peak_demand_hour": peak["t"] % 24,
                     "peak_demand_kw": peak["demand_kw"]})
    return {"points": points, "days": days, "method": "Clear-sky irradiance model × weather factor, P10–P90 heuristic bands"}


def run_simulation(cfg: dict) -> dict:
    d = dispatch(cfg)
    s = d["summary"]
    b = cfg["battery"]
    start = cfg["outage_start_hour"] if cfg["outage_duration_h"] > 0 else 18
    soc_at = next((r["soc_pct"] for r in d["hourly"] if r["hour"] == (start - 1) % 24), b["initial_soc_pct"])
    avg_load = s["total_demand_kwh"] / 24
    out = outage_survival(b["capacity_kwh"], soc_at, b["min_soc_pct"], avg_load, cfg["critical_load_share"],
                          cfg["essential_load_share"], start, s["installed_pv_kw"], cfg["weather"],
                          b["round_trip_efficiency_pct"])
    return {**d, "outage": out, "maintenance": maintenance(cfg, s), "forecast": forecast(cfg)}
