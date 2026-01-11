# celery_app/tasks/email_tasks.py
from celery import Task
from celery_app.celery_config import celery_app
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from jinja2 import Template
import time

# Email configuration
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM = os.getenv('SMTP_FROM', 'CodeSense <noreply@codesense.com>')


class EmailTask(Task):
    # Base task with retry logic
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True


@celery_app.task(bind=True, base=EmailTask, name='send_single_email')

def send_single_email(self, to_email, subject, html_content, text_content=None):
    """Send a single email"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return {
            'status': 'success',
            'to': to_email,
            'subject': subject,
            'message': 'Email sent successfully'
        }
        
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        raise self.retry(exc=e, countdown=60)


@celery_app.task(bind=True, name='send_bulk_emails')

def send_bulk_emails(self, recipients, subject, html_template, template_data=None):
    """Send bulk emails to multiple recipients"""
    results = {
        'total': len(recipients),
        'sent': 0,
        'failed': 0,
        'errors': []
    }
    
    template = Template(html_template)
    
    for idx, recipient in enumerate(recipients):
        try:
            # Update task state with progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': idx + 1,
                    'total': len(recipients),
                    'status': f'Sending to {recipient["email"]}'
                }
            )
            
            # Render template
            context = {
                'name': recipient.get('name', 'User'),
                'email': recipient['email']
            }
            if template_data:
                context.update(template_data)
            
            html_content = template.render(**context)
            
            # Send email
            send_single_email.apply_async(
                args=[recipient['email'], subject, html_content],
                countdown=idx * 2
            )
            
            results['sent'] += 1
            time.sleep(0.5)
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'email': recipient['email'],
                'error': str(e)
            })
            print(f"Error queuing email for {recipient['email']}: {str(e)}")
    
    # Return final results (this is what gets stored in Redis)
    return results


@celery_app.task(name='send_welcome_email')

def send_welcome_email(user_email, user_name):
    """Send welcome email to new users"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; color: white; }}
            .content {{ padding: 30px; background: #f9fafb; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to CodeSense! 🚀</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Thank you for joining CodeSense. We're excited to have you on board!</p>
                <p>With CodeSense, you can:</p>
                <ul>
                    <li>Explain code in multiple programming languages</li>
                    <li>Convert code between different languages</li>
                    <li>Track your code analysis history</li>
                    <li>View detailed statistics</li>
                </ul>
                <a href="https://codesense.com/dashboard" class="button">Get Started</a>
            </div>
            <div class="footer">
                <p>© 2024 CodeSense. All rights reserved.</p>
                <p>If you didn't sign up for this account, please ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_single_email.apply_async(
        args=[user_email, "Welcome to CodeSense! 🚀", html_content]
    )


@celery_app.task(name='send_password_reset_email')
def send_password_reset_email(user_email, user_name, reset_token):
    """Send password reset email"""
    
    reset_link = f"https://codesense.com/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #ef4444; padding: 30px; text-align: center; color: white; }}
            .content {{ padding: 30px; background: #f9fafb; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            .warning {{ background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request 🔐</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>We received a request to reset your password for your CodeSense account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <p>This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
                </div>
            </div>
            <div class="footer">
                <p>© 2024 CodeSense. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_single_email.apply_async(
        args=[user_email, "Reset Your CodeSense Password", html_content]
    )