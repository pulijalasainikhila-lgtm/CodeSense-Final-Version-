// routes/admin-email.js
const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const celeryClient = require("../utils/celeryClient");
const EmailCampaign = require("../models/EmailCampaign");

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
};

// POST /api/admin/email/bulk - Send bulk emails to selected users
router.post("/bulk", auth, requireAdmin, async (req, res) => {
  try {
    const { userIds, subject, htmlTemplate, templateData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "No users selected" });
    }

    if (!subject || !htmlTemplate) {
      return res.status(400).json({ error: "Subject and email template are required" });
    }

    // Fetch selected users
    const users = await User.find({ _id: { $in: userIds } }).select('name email');

    if (users.length === 0) {
      return res.status(404).json({ error: "No valid users found" });
    }

    // Prepare recipients
    const recipients = users.map(user => ({
      email: user.email,
      name: user.name
    }));

    // Send to Celery
    const task = await celeryClient.sendBulkEmails(
      recipients,
      subject,
      htmlTemplate,
      templateData
    );

    // Save campaign to database
    const campaign = await EmailCampaign.create({
      admin: req.user.id,
      subject,
      taskId: task.taskId,
      recipients: recipients.length,
      status: task.status
    });

    res.json({
      success: true,
      message: `Bulk email task queued for ${recipients.length} users`,
      taskId: task.taskId,
      recipients: recipients.length,
      campaignId: campaign._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/email/all - Send email to all users
router.post("/all", auth, requireAdmin, async (req, res) => {
  try {
    const { subject, htmlTemplate, templateData, roleFilter } = req.body;

    if (!subject || !htmlTemplate) {
      return res.status(400).json({ error: "Subject and email template are required" });
    }

    // Build query
    const query = {};
    if (roleFilter && roleFilter !== 'all') {
      query.role = roleFilter;
    }

    // Fetch all users (or filtered by role)
    const users = await User.find(query).select('name email');

    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    // Prepare recipients
    const recipients = users.map(user => ({
      email: user.email,
      name: user.name
    }));

    // Send to Celery
    const task = await celeryClient.sendBulkEmails(
      recipients,
      subject,
      htmlTemplate,
      templateData
    );

    res.json({
      success: true,
      message: `Bulk email task queued for ${recipients.length} users`,
      taskId: task.taskId,
      recipients: recipients.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// GET /api/admin/email/campaigns - Get campaign history
router.get("/campaigns", auth, requireAdmin, async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('admin', 'name email');

    res.json({ campaigns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/email/campaigns/:id - Update campaign status
router.patch("/campaigns/:id", auth, requireAdmin, async (req, res) => {
  try {
    const { sent, failed, status } = req.body;
    
    const campaign = await EmailCampaign.findByIdAndUpdate(
      req.params.id,
      { sent, failed, status },
      { new: true }
    );

    res.json({ campaign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/email/task/:taskId - Check email task status
// GET /api/admin/email/task/:taskId - Check email task status
router.get("/task/:taskId", auth, requireAdmin, async (req, res) => {
  try {
    const { taskId } = req.params;

    // FIXED: Use the corrected getTaskResult method
    const result = await celeryClient.getTaskResult(taskId);

    await EmailCampaign.findOneAndUpdate(
      { taskId },
      {
        status: result.state === "SUCCESS" ? "success" : 
                result.state === "FAILURE" ? "failed" :
                result.state === "PROGRESS" ? "progress" : 
                "queued",
        progress: result.meta || null
      },
      { new: true }
    );
    return res.json({
      taskId,
      state: result.state,
      result: result.result,
      meta: result.meta
    });

  } catch (err) {
    console.error('Error fetching task status:', err);
    return res.status(500).json({ 
      error: "Error fetching task status",
      state: 'FAILURE'
    });
  }

  // Update campaign status based on task state


});

// GET /api/admin/email/templates - Get email templates
router.get("/templates", auth, requireAdmin, async (req, res) => {
  try {
    const templates = [
      {
        id: 'announcement',
        name: 'General Announcement',
        subject: 'Important Announcement from CodeSense',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📢 Announcement</h1>
        </div>
        <div class="content">
            <h2>Hi {{ name }}!</h2>
            <p>{{ message }}</p>
        </div>
        <div class="footer">
            <p>© 2024 CodeSense. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
      },
      {
        id: 'feature_update',
        name: 'New Feature Update',
        subject: 'New Features Available on CodeSense! 🚀',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9fafb; }
        .feature { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 New Features Released!</h1>
        </div>
        <div class="content">
            <h2>Hi {{ name }}!</h2>
            <p>We're excited to announce new features on CodeSense:</p>
            <div class="feature">
                <strong>{{ feature_name }}</strong>
                <p>{{ feature_description }}</p>
            </div>
            <p>Try them out now at <a href="https://codesense.com/dashboard">your dashboard</a>!</p>
        </div>
        <div class="footer">
            <p>© 2024 CodeSense. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
      },
      {
        id: 'maintenance',
        name: 'Maintenance Notice',
        subject: 'Scheduled Maintenance - CodeSense',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9fafb; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Scheduled Maintenance</h1>
        </div>
        <div class="content">
            <h2>Hi {{ name }}!</h2>
            <p>We'll be performing scheduled maintenance on CodeSense:</p>
            <div class="warning">
                <strong>Maintenance Window:</strong>
                <p>{{ maintenance_date }} at {{ maintenance_time }}</p>
                <p>Expected duration: {{ duration }}</p>
            </div>
            <p>During this time, the service may be temporarily unavailable. We apologize for any inconvenience.</p>
        </div>
        <div class="footer">
            <p>© 2024 CodeSense. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
      }
    ];

    res.json({ templates });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;