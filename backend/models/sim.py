import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

Weather = Literal["sunny", "partly_cloudy", "overcast", "rainy"]
DemandProfile = Literal["residential", "evening_peak", "daytime_home", "flat"]


class SolarGroup(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    pv_kw_per_home: float = Field(ge=0, le=50)
    homes: int = Field(ge=0, le=500)


class BatteryConfig(BaseModel):
    capacity_kwh: float = Field(ge=0, le=5000)
    max_charge_kw: float = Field(ge=0, le=2000)
    max_discharge_kw: float = Field(ge=0, le=2000)
    initial_soc_pct: float = Field(ge=0, le=100)
    min_soc_pct: float = Field(ge=0, le=90)
    round_trip_efficiency_pct: float = Field(ge=50, le=100)


class SimConfig(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    groups: list[SolarGroup] = Field(min_length=1, max_length=10)
    non_solar_consumers: int = Field(ge=0, le=1000)
    demand_profile: DemandProfile
    daily_kwh_per_home: float = Field(gt=0, le=100)
    battery: BatteryConfig
    weather: Weather
    grid_available: bool
    outage_start_hour: int = Field(ge=0, le=23)
    outage_duration_h: int = Field(ge=0, le=24)
    enable_dsm: bool
    enable_p2p: bool
    export_limit_kw: float = Field(ge=0, le=5000)
    import_tariff: float = Field(ge=0, le=500)
    export_tariff: float = Field(ge=0, le=500)
    days_since_cleaning: int = Field(ge=0, le=365)
    panel_age_years: float = Field(ge=0, le=40)
    critical_load_share: float = Field(ge=0.05, le=1)
    essential_load_share: float = Field(ge=0.05, le=1)


class HourRow(BaseModel):
    hour: int
    generation_kw: float
    demand_kw: float
    base_demand_kw: float
    dsm_shift_kw: float
    p2p_kw: float
    battery_charge_kw: float
    battery_discharge_kw: float
    soc_pct: float
    grid_import_kw: float
    grid_export_kw: float
    curtailment_kw: float
    unserved_kw: float
    grid_available: bool
    decision: str


class Summary(BaseModel):
    total_generation_kwh: float
    total_demand_kwh: float
    self_sufficiency_pct: float
    self_consumption_pct: float
    grid_import_kwh: float
    grid_export_kwh: float
    curtailment_kwh: float
    p2p_shared_kwh: float
    dsm_shifted_kwh: float
    battery_charge_kwh: float
    battery_discharge_kwh: float
    battery_cycles: float
    min_soc_pct: float
    final_soc_pct: float
    unserved_kwh: float
    peak_import_kw: float
    net_cost: float
    baseline_cost: float
    savings: float
    installed_pv_kw: float
    total_homes: int


class GroupBalance(BaseModel):
    name: str
    generation_kwh: float
    demand_kwh: float
    net_kwh: float


class OutageTier(BaseModel):
    key: str
    label: str
    load_share: float
    survival_hours: float
    survives_72h: bool
    soc_trace: list[float]


class OutageResult(BaseModel):
    tiers: list[OutageTier]
    recommendations: list[str]
    start_hour: int
    usable_energy_kwh: float


class Alert(BaseModel):
    severity: Literal["info", "warning", "critical"]
    title: str
    detail: str


class CleaningSlot(BaseModel):
    cycle: int
    in_days: int


class MaintenanceResult(BaseModel):
    soiling_loss_pct: float
    degradation_pct: float
    inverter_efficiency_pct: float
    energy_lost_soiling_kwh_day: float
    cleaning_recovery_value_day: float
    cleaning_recommended: bool
    days_until_cleaning: int
    health_score: int
    alerts: list[Alert]
    cleaning_schedule: list[CleaningSlot]


class ForecastPoint(BaseModel):
    t: int
    label: str
    weather: Weather
    generation_kw: float
    generation_p10: float
    generation_p90: float
    demand_kw: float
    demand_p10: float
    demand_p90: float


class ForecastDay(BaseModel):
    day: int
    weather: Weather
    weather_label: str
    generation_kwh: float
    demand_kwh: float
    net_kwh: float
    peak_demand_hour: int
    peak_demand_kw: float


class ForecastResult(BaseModel):
    points: list[ForecastPoint]
    days: list[ForecastDay]
    method: str


class SimResult(BaseModel):
    hourly: list[HourRow]
    summary: Summary
    groups: list[GroupBalance]
    outage: OutageResult
    maintenance: MaintenanceResult
    forecast: ForecastResult


class Explanation(BaseModel):
    topic: str
    text: str
    source: Literal["gemini", "rule_based"]
    created_at: datetime


class SimRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    is_demo: bool = False
    config: SimConfig
    result: SimResult
    explanations: dict[str, Explanation] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SimRunSummary(BaseModel):
    id: str
    name: str
    is_demo: bool
    weather: Weather
    created_at: datetime
    summary: Summary


class PreviewResponse(BaseModel):
    config: SimConfig
    result: SimResult


class OutageRequest(BaseModel):
    battery_kwh: float = Field(ge=0, le=5000)
    soc_pct: float = Field(ge=0, le=100)
    min_soc_pct: float = Field(ge=0, le=90)
    load_kw: float = Field(gt=0, le=5000)
    critical_share: float = Field(ge=0.05, le=1)
    essential_share: float = Field(ge=0.05, le=1)
    start_hour: int = Field(ge=0, le=23)
    pv_kw: float = Field(ge=0, le=5000)
    weather: Weather


ExplainTopic = Literal["overview", "energy_balance", "forecast", "maintenance", "outage"]


class ExplainRequest(BaseModel):
    topic: ExplainTopic


class CompareRequest(BaseModel):
    ids: list[str] = Field(min_length=2, max_length=3)
