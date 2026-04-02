import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "gmkt_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.services.social_publishing"]
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
        }
    }
)
