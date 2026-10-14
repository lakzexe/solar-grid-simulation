from copy import deepcopy

DEFAULT_CONFIG = {
    "name": "Sunny baseline",
    "groups": [{"name": "Rooftop solar homes", "pv_kw_per_home": 4.0, "homes": 12}],
    "non_solar_consumers": 8,
    "demand_profile": "residential",
    "daily_kwh_per_home": 12.0,
    "battery": {"capacity_kwh": 48.0, "max_charge_kw": 12.0, "max_discharge_kw": 12.0, "initial_soc_pct": 72.0, "min_soc_pct": 15.0, "round_trip_efficiency_pct": 92.0},
    "weather": "sunny",
    "grid_available": True,
    "outage_start_hour": 18,
    "outage_duration_h": 0,
    "enable_dsm": True,
    "enable_p2p": True,
    "export_limit_kw": 50.0,
    "import_tariff": 0.28,
    "export_tariff": 0.08,
    "days_since_cleaning": 18,
    "panel_age_years": 3.0,
    "critical_load_share": 0.25,
    "essential_load_share": 0.5,
}


def demo_variants() -> list[dict]:
    outage = deepcopy(DEFAULT_CONFIG)
    outage["name"] = "Monsoon outage resilience"
    outage["weather"] = "rainy"
    outage["outage_start_hour"] = 17
    outage["outage_duration_h"] = 12
    outage["battery"]["initial_soc_pct"] = 85.0

    storage = deepcopy(DEFAULT_CONFIG)
    storage["name"] = "Expanded storage benchmark"
    storage["battery"]["capacity_kwh"] = 80.0
    storage["battery"]["max_charge_kw"] = 20.0
    storage["battery"]["max_discharge_kw"] = 20.0
    return [deepcopy(DEFAULT_CONFIG), outage, storage]
