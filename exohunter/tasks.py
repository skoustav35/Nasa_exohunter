import os
import requests
import traceback
from exohunter.celery_app import app
from exohunter.simulation import BayesianPipelineDirector
from exohunter.anomaly_engines import (
    Engine_Secondary_Eclipse_Screener, Engine_TTV_Evaluator,
    Engine_Benchmark_State_Enforcer, Engine_Geometric_Depth_Corrector, Engine_Narrative_Consensus
)

@app.task(bind=True, name="exohunter.run_profile_scan")
def run_profile_scan(self, tic_id: str, period_days: float, transit_duration_hours: float | None = None, stellar_context: dict | None = None):
    """
    Decoupled non-blocking background worker that runs the full high-fidelity
    Bayesian modeling pipeline and handles firewall reporting.
    """
    if stellar_context is None:
        stellar_context = {"stellar_radius_solar": 1.0, "benchmark_locked": False}

    def progress_update(progress: int, stage: str):
        self.update_state(
            state="PROGRESS",
            meta={"progress": progress, "stage": stage, "tic_id": tic_id, "period_days": period_days}
        )

    progress_update(2, "Task accepted by Celery. Initializing prior distributions...")

    try:
        # 1. Instantiate and run the refactored Object-Oriented Director
        director = BayesianPipelineDirector(
            tic_id=tic_id, period=period_days, epoch=1325.0, duration=transit_duration_hours or 2.0, stellar_context=stellar_context
        )
        payload = director.execute()
        
        if stellar_context.get("benchmark_locked"):
            payload["benchmark_locked"] = True

        progress_update(75, "Bayesian fit complete. Evaluating consensus matrices...")

        # 2. Coordinate outputs through the targeted sub-engines
        lc_data = {
            "secondary_eclipse_report": {}, 
            "ttv_report": {}, 
            "source_authority": "gaia_dr3_hardlock" if payload.get("benchmark_locked") else "fallback"
        }
        payload = Engine_Secondary_Eclipse_Screener().execute_correction_flow(payload, lc_data)
        payload = Engine_TTV_Evaluator().execute_correction_flow(payload, lc_data)
        payload = Engine_Geometric_Depth_Corrector().execute_correction_flow(payload, lc_data)
        payload = Engine_Benchmark_State_Enforcer().execute_correction_flow(payload, lc_data)
        payload = Engine_Narrative_Consensus().execute_correction_flow(payload, lc_data)

        # 3. Securely transmit the finalized data array to the Supabase Edge Firewall Bridge
        supabase_id = os.getenv("SUPABASE_PROJECT_ID", "your-id")
        supabase_bridge_url = f"https://{supabase_id}.supabase.co/functions/v1/exohunter-bridge"
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(supabase_bridge_url, json={"payload": payload}, headers=headers)
        
        progress_update(100, "Validation complete. Document pushed live to database storage.")
        return {"status": "completed", "supabase_status": response.status_code, "payload": payload}

    except Exception as exc:
        self.update_state(
            state="FAILURE",
            meta={"progress": 100, "stage": "Task failed.", "tic_id": tic_id, "error": str(exc), "traceback": traceback.format_exc()}
        )
        raise
