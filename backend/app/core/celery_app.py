import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "gmkt_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.services.social_publishing", "app.services.analytics_sync"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Costa_Rica",
    enable_utc=True,
    beat_schedule={
        "check-scheduled-posts-every-min": {
            "task": "app.services.social_publishing.check_scheduled_posts",
            "schedule": 60.0,
        },
        "sync-metrics-every-6-hours": {
            "task": "app.services.analytics_sync.sync_all_social_metrics",
            "schedule": 21600.0, # 6 horas en segundos
        }
    }
)
