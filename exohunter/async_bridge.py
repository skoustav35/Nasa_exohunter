"""CLI bridge between the TypeScript server and Celery workers."""

from __future__ import annotations

import argparse
import json

try:
    from celery.result import AsyncResult
except Exception:  # pragma: no cover - optional dependency guard
    AsyncResult = None

from exohunter.tasks import celery_app


def enqueue_profile_task(tic_id: str, period_days: float, transit_duration_hours: float | None = None) -> dict:
    """Submit a full ExoHunter physical-profile job to Celery."""
    if celery_app is None:
        raise RuntimeError("Celery is not available. Install the Python worker dependencies first.")

    task = celery_app.send_task(
        "exohunter.run_profile_scan",
        args=[tic_id, period_days, transit_duration_hours],
    )
    return {
        "job_id": task.id,
        "status": "QUEUED",
        "tic_id": tic_id,
        "period_days": period_days,
    }


def verify_against_archive(tic_id: str, measured_radius: float | None = None, measured_period: float | None = None) -> dict:
    """Cross-verify measured parameters against the NASA Exoplanet Archive."""
    from exohunter.grounding import verify_against_nasa_archive
    return verify_against_nasa_archive(tic_id, measured_radius, measured_period)


def get_task_status(job_id: str) -> dict:
    """Read a Celery task result in a JSON-friendly structure."""
    if celery_app is None or AsyncResult is None:
        raise RuntimeError("Celery is not available. Install the Python worker dependencies first.")

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


def main() -> None:
    parser = argparse.ArgumentParser(description="ExoHunter async bridge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    enqueue_parser = subparsers.add_parser("enqueue-profile", help="Queue a physical-profile analysis task.")
    enqueue_parser.add_argument("tic_id")
    enqueue_parser.add_argument("period_days", type=float)
    enqueue_parser.add_argument("transit_duration_hours", nargs="?", type=float)

    status_parser = subparsers.add_parser("status", help="Get Celery task status.")
    status_parser.add_argument("job_id")

    archive_parser = subparsers.add_parser("verify-archive", help="Cross-verify against NASA Exoplanet Archive.")
    archive_parser.add_argument("tic_id")
    archive_parser.add_argument("--radius", type=float, default=None, help="Measured planet radius in R_earth")
    archive_parser.add_argument("--period", type=float, default=None, help="Measured orbital period in days")

    args = parser.parse_args()
    if args.command == "enqueue-profile":
        payload = enqueue_profile_task(args.tic_id, args.period_days, args.transit_duration_hours)
    elif args.command == "verify-archive":
        payload = verify_against_archive(args.tic_id, args.radius, args.period)
    else:
        payload = get_task_status(args.job_id)

    print(json.dumps(payload))


if __name__ == "__main__":
    main()

