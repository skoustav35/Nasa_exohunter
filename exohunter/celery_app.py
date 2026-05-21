import os
from celery import Celery

redis_url = os.getenv("EXOHUNTER_CELERY_BROKER_URL", "redis://localhost:6379/0")
app = Celery('exohunter', broker=redis_url, backend=redis_url)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=14400  # Kill execution cleanly if a dynesty thread runs past 4 hours
)
