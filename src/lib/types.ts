export type Weather = "sunny" | "partly_cloudy" | "overcast" | "rainy";
export type DemandProfile = "residential" | "evening_peak" | "daytime_home" | "flat";
export type ExplainTopic = "overview" | "energy_balance" | "forecast" | "maintenance" | "outage";

export interface UserPublic { id: string; email: string; name: string; organization: string; currency: string; created_at: string; }
export interface ProfileUpdate { name: string; organization: string; currency: string; }
export interface MessageResponse { message: string; }
export interface IntegrationStatus { key: string; label: string; status: "connected" | "demo" | "not_connected"; detail: string; }

export interface SolarGroup { name: string; pv_kw_per_home: number; homes: number; }
export interface BatteryConfig { capacity_kwh: number; max_charge_kw: number; max_discharge_kw: number; initial_soc_pct: number; min_soc_pct: number; round_trip_efficiency_pct: number; }
export interface SimConfig { name: string; groups: SolarGroup[]; non_solar_consumers: number; demand_profile: DemandProfile; daily_kwh_per_home: number; battery: BatteryConfig; weather: Weather; grid_available: boolean; outage_start_hour: number; outage_duration_h: number; enable_dsm: boolean; enable_p2p: boolean; export_limit_kw: number; import_tariff: number; export_tariff: number; days_since_cleaning: number; panel_age_years: number; critical_load_share: number; essential_load_share: number; }

export interface HourRow { hour: number; generation_kw: number; demand_kw: number; base_demand_kw: number; dsm_shift_kw: number; p2p_kw: number; battery_charge_kw: number; battery_discharge_kw: number; soc_pct: number; grid_import_kw: number; grid_export_kw: number; curtailment_kw: number; unserved_kw: number; grid_available: boolean; decision: string; }
export interface Summary { total_generation_kwh: number; total_demand_kwh: number; self_sufficiency_pct: number; self_consumption_pct: number; grid_import_kwh: number; grid_export_kwh: number; curtailment_kwh: number; p2p_shared_kwh: number; dsm_shifted_kwh: number; battery_charge_kwh: number; battery_discharge_kwh: number; battery_cycles: number; min_soc_pct: number; final_soc_pct: number; unserved_kwh: number; peak_import_kw: number; net_cost: number; baseline_cost: number; savings: number; installed_pv_kw: number; total_homes: number; }
export interface GroupBalance { name: string; generation_kwh: number; demand_kwh: number; net_kwh: number; }
export interface OutageTier { key: string; label: string; load_share: number; survival_hours: number; survives_72h: boolean; soc_trace: number[]; }
export interface OutageResult { tiers: OutageTier[]; recommendations: string[]; start_hour: number; usable_energy_kwh: number; }
export interface Alert { severity: "info" | "warning" | "critical"; title: string; detail: string; }
export interface CleaningSlot { cycle: number; in_days: number; }
export interface MaintenanceResult { soiling_loss_pct: number; degradation_pct: number; inverter_efficiency_pct: number; energy_lost_soiling_kwh_day: number; cleaning_recovery_value_day: number; cleaning_recommended: boolean; days_until_cleaning: number; health_score: number; alerts: Alert[]; cleaning_schedule: CleaningSlot[]; }
export interface ForecastPoint { t: number; label: string; weather: Weather; generation_kw: number; generation_p10: number; generation_p90: number; demand_kw: number; demand_p10: number; demand_p90: number; }
export interface ForecastDay { day: number; weather: Weather; weather_label: string; generation_kwh: number; demand_kwh: number; net_kwh: number; peak_demand_hour: number; peak_demand_kw: number; }
export interface ForecastResult { points: ForecastPoint[]; days: ForecastDay[]; method: string; }
export interface SimResult { hourly: HourRow[]; summary: Summary; groups: GroupBalance[]; outage: OutageResult; maintenance: MaintenanceResult; forecast: ForecastResult; }
export interface Explanation { topic: string; text: string; source: "gemini" | "rule_based"; created_at: string; }
export interface SimRun { id: string; user_id: string; name: string; is_demo: boolean; config: SimConfig; result: SimResult; explanations: Record<string, Explanation>; created_at: string; }
export interface SimRunSummary { id: string; name: string; is_demo: boolean; weather: Weather; created_at: string; summary: Summary; }
export interface PreviewResponse { config: SimConfig; result: SimResult; }
export interface OutageRequest { battery_kwh: number; soc_pct: number; min_soc_pct: number; load_kw: number; critical_share: number; essential_share: number; start_hour: number; pv_kw: number; weather: Weather; }
