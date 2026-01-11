# celery_app/celery_config.py
from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Celery
celery_app = Celery(
    'codesense_tasks',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
)

# Celery configuration 
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # IMPORTANT: These settings ensure results are stored
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,
    task_ignore_result=False,  # MUST be False to store results
    task_store_errors_even_if_ignored=True,
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['celery_app.tasks'])