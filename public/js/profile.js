import { apiFetch, requireAuth, getUser, saveUser, clearToken } from "./common.js";

requireAuth();

const user = getUser();

// DOM Elements
const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const logoutMainBtn = document.getElementById('logout-main-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const avatarInitials = document.getElementById('avatar-initials');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const historyCount = document.getElementById('history-count');
const accountCreated = document.getElementById('account-created');

const profileError = document.getElementById('profile-error');
const profileSuccess = document.getElementById('profile-success');
const passwordError = document.getElementById('password-error');
const passwordSuccess = document.getElementById('password-success');

const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

// Initialize profile data
function initializeProfile() {
  if (user) {
    profileName.textContent = user.name;
    profileEmail.textContent = user.email;
    profileRole.textContent = user.role || 'user';
    nameInput.value = user.name;
    emailInput.value = user.email;
    
    // Set avatar initials
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarInitials.textContent = initials;
    
    // Set account created date if available
    if (user.createdAt) {
      const date = new Date(user.createdAt);
      accountCreated.textContent = date.toLocaleDateString();
    }
  }
  
  loadHistoryCount();
}

// Load history count
async function loadHistoryCount() {
  try {
    const data = await apiFetch("/api/history");
    if (Array.isArray(data)) {
      historyCount.textContent = data.length;
    }
  } catch (err) {
    console.error('Error loading history count:', err);
  }
}

// Show message helpers
function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

function showSuccess(element, message) {
  element.textContent = message;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Profile form submission
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newName = nameInput.value.trim();
  
  if (!newName) {
    showError(profileError, 'Name cannot be empty');
    return;
  }
  
  try {
    // API endpoint to update user profile
    const data = await apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: newName })
    });
    
    // Update local storage
    const updatedUser = { ...user, name: newName };
    saveUser(updatedUser);
    
    // Update UI
    profileName.textContent = newName;
    const initials = newName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarInitials.textContent = initials;
    
    showSuccess(profileSuccess, 'Profile updated successfully!');
  } catch (err) {
    showError(profileError, err.message || 'Failed to update profile');
  }
});

// Password form submission
passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Validation
  if (newPassword !== confirmPassword) {
    showError(passwordError, 'New passwords do not match');
    return;
  }
  
  if (newPassword.length < 6) {
    showError(passwordError, 'Password must be at least 6 characters');
    return;
  }
  
  if (currentPassword === newPassword) {
    showError(passwordError, 'New password must be different from current password');
    return;
  }
  
  try {
    // API endpoint to change password
    await apiFetch('/api/user/change-password', {
      method: 'PUT',
      body: JSON.stringify({ 
        currentPassword, 
        newPassword 
      })
    });
    
    showSuccess(passwordSuccess, 'Password updated successfully!');
    passwordForm.reset();
  } catch (err) {
    showError(passwordError, err.message || 'Failed to update password');
  }
});

// Clear history with confirmation
clearHistoryBtn.addEventListener('click', () => {
  showConfirmModal(
    'Clear All History',
    'Are you sure you want to delete all your history? This action cannot be undone.',
    async () => {
      try {
        // API endpoint to clear history
        await apiFetch('/api/history', {
          method: 'DELETE'
        });
        
        historyCount.textContent = '0';
        alert('History cleared successfully!');
      } catch (err) {
        alert('Failed to clear history: ' + err.message);
      }
    }
  );
});

// Logout
logoutMainBtn.addEventListener('click', () => {
  showConfirmModal(
    'Logout',
    'Are you sure you want to logout?',
    () => {
      clearToken();
      window.location.href = 'login.html';
    }
  );
});

// Delete account with confirmation
deleteAccountBtn.addEventListener('click', () => {
  showConfirmModal(
    'Delete Account',
    'Are you sure you want to delete your account? This will permanently delete all your data and cannot be undone.',
    async () => {
      try {
        // API endpoint to delete account
        await apiFetch('/api/user/account', {
          method: 'DELETE'
        });
        
        clearToken();
        window.location.href = 'login.html';
      } catch (err) {
        alert('Failed to delete account: ' + err.message);
      }
    }
  );
});

// Modal functions
function showConfirmModal(title, message, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  confirmModal.classList.add('show');
  
  // Remove old listeners
  const newModalConfirm = modalConfirm.cloneNode(true);
  modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);
  
  // Add new listener
  newModalConfirm.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    onConfirm();
  });
}

modalCancel.addEventListener('click', () => {
  confirmModal.classList.remove('show');
});

// Close modal on outside click
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.remove('show');
  }
});

// Initialize
initializeProfile();