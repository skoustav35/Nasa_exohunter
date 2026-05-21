from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from celery.result import AsyncResult
from exohunter.celery_app import app as celery_app
from exohunter.grounding import verify_against_nasa_archive

app = FastAPI(title="Sarkar ExoHunter FastAPI", description="Scientific Engine Microservice")

class ProfileRequest(BaseModel):
    tic_id: str
    period_days: float
    transit_duration_hours: Optional[float] = None

class ArchiveRequest(BaseModel):
    tic_id: str
    radius: Optional[float] = None
    period: Optional[float] = None

@app.post("/enqueue-profile")
async def enqueue_profile(req: ProfileRequest) -> Dict[str, Any]:
    if celery_app is None:
        raise HTTPException(status_code=500, detail="Celery is not configured.")
    
    # Note: async_bridge.py says "exohunter.tasks.async_analyze_physical_profile", but tasks.py says "exohunter.run_profile_scan"
    # Looking at tasks.py, the task name is "exohunter.run_profile_scan"
    task = celery_app.send_task(
        "exohunter.run_profile_scan",
        args=[req.tic_id, req.period_days, req.transit_duration_hours, {}],
    )
    return {
        "job_id": task.id,
        "status": "QUEUED",
        "tic_id": req.tic_id,
        "period_days": req.period_days,
    }

@app.get("/status/{job_id}")
async def get_status(job_id: str) -> Dict[str, Any]:
    if celery_app is None:
        raise HTTPException(status_code=500, detail="Celery is not configured.")
    
    result = AsyncResult(job_id, app=celery_app)
    response = {
        "job_id": job_id,
        "status": result.status,
        "ready": result.ready(),
        "successful": result.successful() if result.ready() else False,
    }

    meta = result.info if isinstance(result.info, dict) else None
    if meta:
        response["meta"] = meta
        if "progress" in meta:
            response["progress"] = meta["progress"]
        if "stage" in meta:
            response["stage"] = meta["stage"]

    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)

    return response

@app.post("/verify-archive")
async def verify_archive(req: ArchiveRequest) -> Dict[str, Any]:
    try:
        return verify_against_nasa_archive(req.tic_id, req.radius, req.period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CNNRequest(BaseModel):
    flux: list[float]

@app.post("/evaluate-cnn")
async def evaluate_cnn(req: CNNRequest) -> Dict[str, Any]:
    try:
        from exohunter.cnn_vetting import evaluate_transit_cnn
        return evaluate_transit_cnn(req.flux)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
