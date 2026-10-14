from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from engine.simulation import outage_survival, run_simulation
from lib.auth import current_user
from lib.db import db
from lib.defaults import DEFAULT_CONFIG
from lib.explain import ai_available, explain, explain_comparison
from models.auth import IntegrationStatus, MessageResponse
from models.sim import (CompareRequest, ExplainRequest, Explanation, OutageRequest, OutageResult,
                        PreviewResponse, SimConfig, SimRun, SimRunSummary)

router = APIRouter(tags=["simulations"])


def _summary(doc: dict) -> SimRunSummary:
    return SimRunSummary(id=doc["id"], name=doc["name"], is_demo=doc.get("is_demo", False),
                         weather=doc["config"]["weather"], created_at=doc["created_at"],
                         summary=doc["result"]["summary"])


async def _get_run(run_id: str, user_id: str) -> dict:
    doc = await db.runs.find_one({"id": run_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Simulation run not found")
    return doc


@router.get("/simulations/defaults", response_model=SimConfig)
async def defaults(_: dict = Depends(current_user)):
    return SimConfig(**DEFAULT_CONFIG)


@router.post("/simulations/preview", response_model=PreviewResponse)
async def preview(cfg: SimConfig, _: dict = Depends(current_user)):
    return PreviewResponse(config=cfg, result=run_simulation(cfg.model_dump()))


@router.post("/simulations", response_model=SimRun)
async def create_run(cfg: SimConfig, user: dict = Depends(current_user)):
    data = cfg.model_dump()
    run = SimRun(user_id=user["id"], name=cfg.name, config=data, result=run_simulation(data))
    await db.runs.insert_one(run.model_dump())
    return run


@router.get("/simulations", response_model=list[SimRunSummary])
async def list_runs(user: dict = Depends(current_user)):
    docs = await db.runs.find({"user_id": user["id"]}, {"_id": 0, "result.hourly": 0, "result.forecast": 0}) \
        .sort("created_at", -1).to_list(200)
    return [_summary(d) for d in docs]


@router.get("/simulations/{run_id}", response_model=SimRun)
async def get_run(run_id: str, user: dict = Depends(current_user)):
    return SimRun(**await _get_run(run_id, user["id"]))


@router.delete("/simulations/{run_id}", response_model=MessageResponse)
async def delete_run(run_id: str, user: dict = Depends(current_user)):
    res = await db.runs.delete_one({"id": run_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Simulation run not found")
    return MessageResponse(message="Deleted")


@router.post("/simulations/{run_id}/explain", response_model=Explanation)
async def explain_run(run_id: str, body: ExplainRequest, user: dict = Depends(current_user)):
    doc = await _get_run(run_id, user["id"])
    text, source = await explain(body.topic, doc["config"], doc["result"])
    exp = Explanation(topic=body.topic, text=text, source=source, created_at=datetime.now(timezone.utc))
    await db.runs.update_one({"id": run_id}, {"$set": {f"explanations.{body.topic}": exp.model_dump()}})
    return exp


@router.post("/compare/explain", response_model=Explanation)
async def compare_explain(body: CompareRequest, user: dict = Depends(current_user)):
    runs = [await _get_run(i, user["id"]) for i in body.ids]
    text, source = await explain_comparison(runs)
    return Explanation(topic="comparison", text=text, source=source, created_at=datetime.now(timezone.utc))


@router.post("/engine/outage", response_model=OutageResult)
async def outage(body: OutageRequest, _: dict = Depends(current_user)):
    return outage_survival(body.battery_kwh, body.soc_pct, body.min_soc_pct, body.load_kw, body.critical_share,
                           body.essential_share, body.start_hour, body.pv_kw, body.weather)


@router.post("/demo/reset", response_model=MessageResponse)
async def reset_demo(user: dict = Depends(current_user)):
    from routers.auth import create_demo_runs
    await db.runs.delete_many({"user_id": user["id"], "is_demo": True})
    await create_demo_runs(user["id"])
    return MessageResponse(message="Demonstration scenarios restored")


@router.get("/integrations", response_model=list[IntegrationStatus])
async def integrations(_: dict = Depends(current_user)):
    return [
        IntegrationStatus(key="inverter", label="Inverter telemetry (Modbus / SunSpec)", status="not_connected",
                          detail="Not connected — PV output is produced by the simulation engine."),
        IntegrationStatus(key="meter", label="Smart meter feed (DLMS / MQTT)", status="not_connected",
                          detail="Not connected — demand uses configurable demonstration load profiles."),
        IntegrationStatus(key="weather", label="Weather & irradiance API", status="not_connected",
                          detail="Not connected — weather is a user-selected scenario, not a live forecast."),
        IntegrationStatus(key="ai", label="Gemini AI explanations", status="connected" if ai_available() else "demo",
                          detail="Gemini AI narrates engine results." if ai_available()
                          else "No credentials — rule-based explanations are used."),
    ]
