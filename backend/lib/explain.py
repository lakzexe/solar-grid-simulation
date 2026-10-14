import os


def ai_available() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


async def explain(topic: str, config: dict, result: dict) -> tuple[str, str]:
    summary = result["summary"]
    text = (
        f"The {topic.replace('_', ' ')} view is based on a deterministic 24-hour dispatch. "
        f"The system generated {summary['total_generation_kwh']:.1f} kWh against "
        f"{summary['total_demand_kwh']:.1f} kWh of demand, with "
        f"{summary['self_sufficiency_pct']:.1f}% self-sufficiency. "
        f"Grid import was {summary['grid_import_kwh']:.1f} kWh and the estimated daily saving was "
        f"{summary['savings']:.2f} in the configured currency."
    )
    return text, "rule_based"


async def explain_comparison(runs: list[dict]) -> tuple[str, str]:
    best = max(runs, key=lambda run: run["result"]["summary"]["self_sufficiency_pct"])
    summary = best["result"]["summary"]
    text = (
        f"{best['name']} has the highest self-sufficiency at {summary['self_sufficiency_pct']:.1f}%. "
        f"It imports {summary['grid_import_kwh']:.1f} kWh and exports {summary['grid_export_kwh']:.1f} kWh. "
        "Compare battery cycling, curtailment and outage resilience alongside this headline metric."
    )
    return text, "rule_based"
