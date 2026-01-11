// utils/celeryClient.js
const { redisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

class CeleryClient {
  constructor() {
    this.broker = redisClient;
  }

  async sendTask(taskName, args = [], kwargs = {}, options = {}) {
    try {
      const taskId = uuidv4();
      const queue = options.queue || 'celery';
      
      // Celery message body format
      const messageBody = [
        args,           // positional arguments
        kwargs,         // keyword arguments
        {               // embed metadata
          callbacks: null,
          errbacks: null,
          chain: null,
          chord: null
        }
      ];

      // Celery message format
      const message = {
        body: Buffer.from(JSON.stringify(messageBody)).toString('base64'),
        'content-encoding': 'utf-8',
        'content-type': 'application/json',
        headers: {
          lang: 'js',
          task: taskName,
          id: taskId,
          root_id: taskId,
          parent_id: null,
          group: null,
          meth: null,
          shadow: null,
          eta: null,
          expires: null,
          retries: 0,
          timelimit: [null, null],
          argsrepr: JSON.stringify(args),
          kwargsrepr: JSON.stringify(kwargs),
          origin: 'nodejs-celery-client'
        },
        properties: {
          correlation_id: taskId,
          reply_to: taskId,
          delivery_mode: 2,
          delivery_info: {
            exchange: '',
            routing_key: queue
          },
          priority: 0,
          body_encoding: 'base64',
          delivery_tag: uuidv4()
        }
      };

      // Push to Celery queue in Redis
      await this.broker.lPush(queue, JSON.stringify(message));

      console.log(`✅ Task ${taskName} queued with ID: ${taskId}`);
      
      return {
        taskId,
        status: 'queued',
        queue
      };
    } catch (error) {
      console.error('❌ Error sending task to Celery:', error);
      throw error;
    }
  }

  async getTaskResult(taskId) {
  try {
    // Celery stores results with this key format in the backend DB
    const key = `celery-task-meta-${taskId}`;
    
    // Try to get from Redis DB 1 (result backend)
    // Note: You might need to create a separate Redis client for DB 1
    const redis = require('redis');
    const resultClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: 1  // Result backend uses DB 1
    });
    
    await resultClient.connect();
    const result = await resultClient.get(key);
    await resultClient.quit();
    
    if (!result) {
      return {
        state: 'PENDING',
        result: null,
        meta: null
      };
    }

    const parsed = JSON.parse(result);
    return {
      state: parsed.status || 'PENDING',
      result: parsed.result || null,
      meta: parsed.meta || null
    };
  } catch (error) {
    console.error('Error getting task result:', error);
    return {
      state: 'FAILURE',
      result: error.message,
      meta: null
    };
  }
}

  // Helper to create AsyncResult-like object
  AsyncResult(taskId) {
    return {
      taskId,
      state: async () => {
        const result = await this.getTaskResult(taskId);
        return result.state;
      },
      get: async () => {
        const result = await this.getTaskResult(taskId);
        return result;
      }
    };
  }

  async sendBulkEmails(recipients, subject, htmlTemplate, templateData = null) {
    return this.sendTask(
      'send_bulk_emails',
      [],
      {
        recipients,
        subject,
        html_template: htmlTemplate,
        template_data: templateData
      }
    );
  }

  async sendWelcomeEmail(userEmail, userName) {
    return this.sendTask(
      'send_welcome_email',
      [userEmail, userName]
    );
  }

  // *****************************************************
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    return this.sendTask(
      'send_password_reset_email',
      [userEmail, userName, resetToken]
    );
  }

  async sendSingleEmail(toEmail, subject, htmlContent, textContent = null) {
    return this.sendTask(
      'send_single_email',
      [toEmail, subject, htmlContent, textContent]
    );
  }
}

module.exports = new CeleryClient();