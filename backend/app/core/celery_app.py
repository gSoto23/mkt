from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1"
)

celery_app.conf.task_routes = {
    "app.services.*": "main-queue"
}

@celery_app.task
def dummy_task(x: int, y: int):
    return x + y
