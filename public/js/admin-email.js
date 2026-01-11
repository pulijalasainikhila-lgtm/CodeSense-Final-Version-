// public/js/admin-email.js
import { apiFetch, requireAdmin } from "./common.js";

requireAdmin();

let allUsers = [];
let selectedUsers = new Set();
let emailTemplates = [];
let currentTaskId = null;

// Load users
async function loadUsers() {
  try {
    const users = await apiFetch("/api/admin/users");
    allUsers = users;
    renderUserList(users);
  } catch (err) {
    console.error('Error loading users:', err);
    document.getElementById('user-list').innerHTML = 
      '<p style="text-align: center; color: var(--error);">Error loading users</p>';
  }
}

// Load email templates
async function loadTemplates() {
  try {
    const data = await apiFetch("/api/admin/email/templates");
    emailTemplates = data.templates || [];
    renderTemplateButtons();
  } catch (err) {
    console.error('Error loading templates:', err);
  }
}

// Render user list
function renderUserList(users) {
  const userList = document.getElementById('user-list');
  
  if (!users || users.length === 0) {
    userList.innerHTML = '<p style="text-align: center; color: var(--muted);">No users found</p>';
    return;
  }

  userList.innerHTML = users.map(user => `
    <div class="user-item">
      <input type="checkbox" 
             data-user-id="${user._id}" 
             ${selectedUsers.has(user._id) ? 'checked' : ''}
             class="user-checkbox" />
      <div class="user-info">
        <strong>${user.name}</strong>
        <span>${user.email} • ${user.role}</span>
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.user-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const userId = e.target.getAttribute('data-user-id');
      if (e.target.checked) {
        selectedUsers.add(userId);
      } else {
        selectedUsers.delete(userId);
      }
      updateSelectionSummary();
    });
  });

  updateSelectionSummary();
}

// Render template buttons
function renderTemplateButtons() {
  const container = document.getElementById('template-buttons');
  
  const buttons = emailTemplates.map(template => `
    <button class="template-btn" data-template-id="${template.id}">
      ${template.name}
    </button>
  `).join('');

  container.innerHTML = `
    <button class="template-btn active" data-template-id="custom">Custom Email</button>
    ${buttons}
  `;

  // Add event listeners
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const templateId = e.target.getAttribute('data-template-id');
      if (templateId !== 'custom') {
        loadTemplate(templateId);
      } else {
        clearTemplate();
      }
    });
  });
}

// Load a template
function loadTemplate(templateId) {
  const template = emailTemplates.find(t => t.id === templateId);
  if (template) {
    document.getElementById('email-subject').value = template.subject;
    document.getElementById('email-html').value = template.html;
  }
}

// Clear template
function clearTemplate() {
  document.getElementById('email-subject').value = '';
  document.getElementById('email-html').value = '';
  document.getElementById('template-data').value = '';
}

// Update selection summary
function updateSelectionSummary() {
  const count = selectedUsers.size;
  const summary = document.getElementById('selection-summary');
  summary.textContent = `${count} user${count !== 1 ? 's' : ''} selected`;
}

// Select all users
document.getElementById('select-all-btn').addEventListener('click', () => {
  const roleFilter = document.getElementById('role-filter').value;
  let usersToSelect = allUsers;
  
  if (roleFilter !== 'all') {
    usersToSelect = allUsers.filter(u => u.role === roleFilter);
  }
  
  usersToSelect.forEach(user => selectedUsers.add(user._id));
  renderUserList(allUsers);
});

// Deselect all users
document.getElementById('deselect-all-btn').addEventListener('click', () => {
  selectedUsers.clear();
  renderUserList(allUsers);
});

// Role filter
document.getElementById('role-filter').addEventListener('change', (e) => {
  const role = e.target.value;
  if (role === 'all') {
    renderUserList(allUsers);
  } else {
    const filtered = allUsers.filter(u => u.role === role);
    renderUserList(filtered);
  }
});

// Form submission
document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (selectedUsers.size === 0) {
    alert('Please select at least one user');
    return;
  }

  const subject = document.getElementById('email-subject').value.trim();
  const htmlTemplate = document.getElementById('email-html').value.trim();
  const templateDataStr = document.getElementById('template-data').value.trim();

  if (!subject || !htmlTemplate) {
    alert('Subject and email template are required');
    return;
  }

  let templateData = null;
  if (templateDataStr) {
    try {
      templateData = JSON.parse(templateDataStr);
    } catch (err) {
      alert('Invalid JSON in template data. Please check your syntax.');
      return;
    }
  }

  if (!confirm(`Send email to ${selectedUsers.size} users?`)) {
    return;
  }

  try {
    const response = await apiFetch("/api/admin/email/bulk", {
      method: "POST",
      body: JSON.stringify({
        userIds: Array.from(selectedUsers),
        subject,
        htmlTemplate,
        templateData
      })
    });

    currentTaskId = response.taskId;
    showTaskStatus('queued', `Email campaign queued for ${response.recipients} users`);
    
    // Start polling for status
    pollTaskStatus();

  } catch (err) {
    alert('Error sending emails: ' + err.message);
  }
});

// Show task status
function showTaskStatus(status, message) {
  const statusDiv = document.getElementById('task-status');
  const badge = document.getElementById('status-badge');
  const statusMessage = document.getElementById('status-message');
  
  statusDiv.classList.add('show');
  badge.className = `status-badge ${status}`;
  badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  statusMessage.textContent = message;
}


// Poll task status with better handling and database updates
async function pollTaskStatus() {
  if (!currentTaskId) return;

  let pollCount = 0;
  const maxPolls = 60; // Max 5 minutes of polling
  let pollInterval = null;
  let lastSent = 0;

  const checkStatus = async () => {
    try {
      pollCount++;
      
      // Stop polling after max attempts
      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        showTaskStatus('success', 'Emails are being sent in the background. Check history for final status.');
        currentTaskId = null;
        loadCampaignHistory(); // Refresh history
        return;
      }

      const result = await apiFetch(`/api/admin/email/task/${currentTaskId}`);
      
      if (result.state === 'PROGRESS') {
        // Update progress
        const meta = result.meta || {};
        const current = meta.current || 0;
        const total = meta.total || lastSent;
        
        if (total > 0) {
          const percentage = (current / total) * 100;
          document.getElementById('progress-fill').style.width = `${percentage}%`;
          document.getElementById('progress-text').textContent = 
            `${current} / ${total} emails sent`;
          lastSent = Math.max(lastSent, current);
        }
        
      } else if (result.state === 'SUCCESS') {
        // Task completed successfully
        clearInterval(pollInterval);
        const data = result.result || {};
        
        document.getElementById('progress-fill').style.width = '100%';
        document.getElementById('progress-text').textContent = 
          `✅ ${data.sent || 0} emails sent successfully! ${data.failed || 0} failed`;
        
        showTaskStatus('success', `Email campaign completed! ${data.sent || 0} sent, ${data.failed || 0} failed.`);
        
        // Save to history
        saveTaskResult(currentTaskId, data);
        loadCampaignHistory(); // Refresh history
        currentTaskId = null;
        
      } else if (result.state === 'FAILURE') {
        // Task failed
        clearInterval(pollInterval);
        showTaskStatus('failed', 'Email campaign failed. Please check server logs.');
        loadCampaignHistory(); // Refresh history
        currentTaskId = null;
        
      } else if (result.state === 'PENDING') {
        // Still pending
        document.getElementById('progress-text').textContent = 
          'Task queued, waiting for Celery worker...';
      }
      
    } catch (err) {
      console.error('Error checking task status:', err);
      // Don't stop polling on error
    }
  };

  // Initial check
  await checkStatus();

  // Poll every 3 seconds
  pollInterval = setInterval(checkStatus, 3000);
}

// Save task result to localStorage
function saveTaskResult(taskId, data) {
  try {
    const results = JSON.parse(localStorage.getItem('emailCampaigns') || '[]');
    results.unshift({
      taskId,
      timestamp: new Date().toISOString(),
      sent: data.sent || 0,
      failed: data.failed || 0,
      total: data.total || 0
    });
    // Keep only last 10 campaigns
    localStorage.setItem('emailCampaigns', JSON.stringify(results.slice(0, 10)));
  } catch (err) {
    console.error('Error saving task result:', err);
  }
}

// Load previous campaigns on page load
// Load campaign history from backend
async function loadCampaignHistory() {
  try {
    const data = await apiFetch("/api/admin/email/campaigns");
    const campaigns = data.campaigns || [];
    const historyDiv = document.getElementById('campaign-history');
    
    if (campaigns.length === 0) {
      historyDiv.innerHTML = `
        <p style="text-align: center; color: var(--muted); padding: 40px;">
          No campaigns yet. Send your first email to see history here.
        </p>
      `;
      return;
    }
    
    historyDiv.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background: var(--accent-soft);">
          <tr>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--border);">Date</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--border);">Subject</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border);">Recipients</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border);">Status</th>
            
          </tr>
        </thead>
        <tbody>
          ${campaigns.map(campaign => {
            const date = new Date(campaign.createdAt).toLocaleString();
            const statusColors = {
              'queued': '#f59e0b',
              'processing': '#6366f1',
              'success': '#10b981',
              'failed': '#ef4444'
            };
            const statusColor = statusColors[campaign.status] || '#9ca3af';
            
            return `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px; color: var(--text); font-size: 13px;">${date}</td>
                <td style="padding: 12px; color: var(--text);">${campaign.subject}</td>
                <td style="padding: 12px; text-align: center; color: var(--text); font-weight: 600;">
                  ${campaign.recipients}
                </td>
                <td style="padding: 12px; text-align: center;">
                <span style="
                  background: ${statusColor}20;
                  color: ${statusColor};
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-weight: 600;
                  font-size: 12px;
                  text-transform: capitalize;
                  display: inline-block;
                ">
    ${campaign.status}
  </span>
</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Error loading campaign history:', err);
  }
}

// Clear campaign history
window.clearCampaignHistory = function() {
  if (confirm('Are you sure you want to clear campaign history?')) {
    localStorage.removeItem('emailCampaigns');
    loadPreviousCampaigns();
  }
};

// Initialize
loadUsers();
loadTemplates();
loadCampaignHistory();