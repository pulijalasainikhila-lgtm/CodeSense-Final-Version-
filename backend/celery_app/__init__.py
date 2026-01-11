# celery_app/__init__.py
# This file makes the directory a Python package
from .celery_config import celery_app

__all__ = ['celery_app']


# celery_app/tasks/__init__.py  
# This file makes the tasks directory a Python package
from celery_app.tasks.email_tasks import (
    send_single_email,
    send_bulk_emails,
    send_welcome_email,
    send_password_reset_email
)

__all__ = [
    'send_single_email',
    'send_bulk_emails', 
    'send_welcome_email',
    'send_password_reset_email'
]