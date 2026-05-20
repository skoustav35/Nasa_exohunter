"""Celery tasks for background validation jobs."""

from __future__ import annotations

import os
import traceback

try:
    from celery import Celery
except Exception:  # pragma: no cover - optional dependency guard
    Celery = None


def create_celery_app():
    if Celery is None:
        return None

    app = Celery(
        "exohunter",
        broker=os.getenv("EXOHUNTER_CELERY_BROKER_URL", "redis://redis:6379/0"),
        backend=os.getenv("EXOHUNTER_CELERY_RESULT_BACKEND", "redis://redis:6379/1"),
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_track_started=True,
        worker_prefetch_multiplier=1,
        task_time_limit=1800,
        task_acks_late=True,
        worker_max_tasks_per_child=10,
        worker_max_memory_per_child=600000,
        result_extended=True,
    )
    return app


celery_app = create_celery_app()

if celery_app is not None:

    @celery_app.task(bind=True, name="exohunter.run_profile_scan")
    def run_profile_scan(self, tic_id: str, period_days: float, transit_duration_hours: float | None = None):
        from verification_functions import run_full_physical_profile

        def progress_update(progress: int, stage: str):
            self.update_state(
                state="PROGRESS",
                meta={
                    "progress": progress,
                    "stage": stage,
                    "tic_id": tic_id,
                    "period_days": period_days,
                },
            )

        progress_update(2, "Task accepted by Celery worker.")
        try:
            result = run_full_physical_profile(
                tic_id,
                period_days,
                transit_duration_hours,
                progress_callback=progress_update,
            )
            progress_update(100, "Validation profile completed.")
            
            # Push payload to Firebase via the internal webhook in server.ts
            try:
                import requests
                # Assuming the Express server runs on port 3000 locally
                requests.post("http://127.0.0.1:3000/api/internal/push-results", json=result, timeout=10)
            except Exception as e:
                print("Failed to push result to webhook:", e)

            return result
        except Exception as exc:
            self.update_state(
                state="FAILURE",
                meta={
                    "progress": 100,
                    "stage": "Task failed.",
                    "tic_id": tic_id,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                },
            )
            raise

    @celery_app.task(name="exohunter.generate_rnaas_note")
    def generate_rnaas_note(profile: dict):
        from exohunter.reporting import generate_rnaas_template

        return generate_rnaas_template(profile)
