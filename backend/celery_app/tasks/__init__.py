# celery_app/tasks/__init__.py
from celery_app.tasks.email_tasks import (
    send_single_email,
    send_bulk_emails,
    send_welcome_email
)

__all__ = [
    'send_single_email',
    'send_bulk_emails',
    'send_welcome_email'
]
