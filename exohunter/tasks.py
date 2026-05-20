import os
import requests
from exohunter.celery_app import app
from exohunter.simulation import BayesianPipelineDirector

@app.task(bind=True)
def async_analyze_physical_profile(self, tic_id, period_guess, epoch_guess, duration_hours, stellar_context):
    """
    Background Celery task that runs the multi-hour Juliet pipeline.
    """
    print(f"[CELERY WORKER] Starting deep Bayesian scan for TIC {tic_id}...")
    
    # 1. Run the heavy OOP pipeline (from Implementation 2)
    director = BayesianPipelineDirector(tic_id, period_guess, epoch_guess, duration_hours, stellar_context)
    payload = director.execute()

    # 2. Transmit the verified payload to the Supabase Edge Firewall
    supabase_bridge_url = "https://<YOUR_SUPABASE_ID>.supabase.co/functions/v1/exohunter-bridge"
    headers = {"Content-Type": "application/json"}
    
    print(f"[CELERY WORKER] Transmitting payload to Supabase Bridge...")
    try:
        response = requests.post(supabase_bridge_url, json={"payload": payload}, headers=headers, timeout=15)
        if response.status_code == 200:
            print("[CELERY WORKER] Successfully bridged to Firebase.")
        else:
            print(f"[CELERY WORKER] Firewall Blocked Payload: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[CELERY WORKER] Bridge transmission failed: {e}")
        
    return payload
