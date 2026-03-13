from celery import Celery
import os

redis_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
app = Celery("tasks", broker=redis_url, backend=redis_url)

@app.task
def dummy_task():
    return "Worker is alive"
