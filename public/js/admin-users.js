// public/js/admin-users.js
import { apiFetch, requireAdmin } from "./common.js";

requireAdmin();

let allUsers = [];
let filteredUsers = [];
let selectedUsers = new Set();
let currentFilter = 'all';
let currentPage = 1;
const usersPerPage = 10;
let userToDelete = null;

// DOM Elements
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const selectAllCheckbox = document.getElementById('select-all');
const usersTableBody = document.getElementById('users-table-body');
const bulkActions = document.getElementById('bulk-actions');
const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// Load all data
async function loadData() {
  try {
    // Load users
    const users = await apiFetch("/api/admin/users");
    allUsers = users;
    filteredUsers = users;
    
    // Load stats
    const stats = await apiFetch("/api/admin/stats");
    updateStats(stats);
    
    // Render users
    renderUsers();
  } catch (err) {
    console.error('Error loading data:', err);
    showError('Failed to load users');
  }
}

// Update statistics
function updateStats(stats) {
  document.getElementById('total-users').textContent = stats.totalUsers || 0;
  document.getElementById('total-history').textContent = stats.totalHistory || 0;
  
  // Count admin and regular users
  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  const regularCount = allUsers.filter(u => u.role === 'user').length;
  
  document.getElementById('admin-users').textContent = adminCount;
  document.getElementById('regular-users').textContent = regularCount;
}

// Render users table
function renderUsers() {
  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  if (paginatedUsers.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3>No users found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        </td>
      </tr>
    `;
    pagination.style.display = 'none';
    return;
  }

  usersTableBody.innerHTML = paginatedUsers.map(user => {
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const joinedDate = new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const isSelected = selectedUsers.has(user._id);

    return `
      <tr>
        <td>
          <input type="checkbox" 
                 class="user-checkbox" 
                 data-user-id="${user._id}"
                 ${isSelected ? 'checked' : ''} />
        </td>
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initials}</div>
            <div class="user-info-cell">
              <h4>${user.name}</h4>
              <p>${user.email}</p>
            </div>
          </div>
        </td>
        <td>
          <span class="role-badge ${user.role}">${user.role}</span>
        </td>
        <td>${joinedDate}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" onclick="viewUser('${user._id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View
            </button>
            <button class="btn-icon danger" onclick="deleteUser('${user._id}', '${user.name}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to checkboxes
  document.querySelectorAll('.user-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });

  // Update pagination
  if (filteredUsers.length > usersPerPage) {
    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  } else {
    pagination.style.display = 'none';
  }

  // Update select all checkbox
  updateSelectAllCheckbox();
}

// Handle checkbox change
function handleCheckboxChange(e) {
  const userId = e.target.getAttribute('data-user-id');
  if (e.target.checked) {
    selectedUsers.add(userId);
  } else {
    selectedUsers.delete(userId);
  }
  updateBulkActions();
  updateSelectAllCheckbox();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
  const visibleUserIds = visibleUsers.map(u => u._id);
  const allVisibleSelected = visibleUserIds.every(id => selectedUsers.has(id));
  const someVisibleSelected = visibleUserIds.some(id => selectedUsers.has(id));

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = allVisibleSelected && visibleUsers.length > 0;
    selectAllCheckbox.indeterminate = someVisibleSelected && !allVisibleSelected;
  }
}

// Update bulk actions visibility
function updateBulkActions() {
  if (selectedUsers.size > 0) {
    bulkActions.style.display = 'flex';
  } else {
    bulkActions.style.display = 'none';
  }
}

// Select all checkbox
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', (e) => {
    const visibleUsers = filteredUsers.slice(
      (currentPage - 1) * usersPerPage,
      currentPage * usersPerPage
    );
    
    if (e.target.checked) {
      visibleUsers.forEach(user => selectedUsers.add(user._id));
    } else {
      visibleUsers.forEach(user => selectedUsers.delete(user._id));
    }
    
    renderUsers();
    updateBulkActions();
  });
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    applyFilters(query, currentFilter);
  });
}

// Filter buttons
filterButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    filterButtons.forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    currentFilter = e.currentTarget.getAttribute('data-role');
    const query = searchInput.value.toLowerCase().trim();
    applyFilters(query, currentFilter);
  });
});

// Apply filters
function applyFilters(searchQuery, roleFilter) {
  filteredUsers = allUsers.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery) ||
      user.email.toLowerCase().includes(searchQuery);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  currentPage = 1; // Reset to first page
  renderUsers();
}

// Pagination
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderUsers();
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderUsers();
    }
  });
}

// View user (you can implement this)
window.viewUser = function(userId) {
  const user = allUsers.find(u => u._id === userId);
  if (user) {
    alert(`User Details:\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nJoined: ${new Date(user.createdAt).toLocaleString()}`);
    // Or navigate to a detailed user page
    // window.location.href = `admin-user-detail.html?id=${userId}`;
  }
};

// Delete single user
window.deleteUser = function(userId, userName) {
  userToDelete = { id: userId, name: userName, bulk: false };
  deleteMessage.textContent = `Are you sure you want to delete "${userName}"? This will also delete all their history. This action cannot be undone.`;
  deleteModal.classList.add('show');
};

// Bulk delete
if (bulkDeleteBtn) {
  bulkDeleteBtn.addEventListener('click', () => {
    if (selectedUsers.size === 0) return;
    
    userToDelete = { ids: Array.from(selectedUsers), bulk: true };
    deleteMessage.textContent = `Are you sure you want to delete ${selectedUsers.size} user(s)? This will also delete all their history. This action cannot be undone.`;
    deleteModal.classList.add('show');
  });
}

// Cancel delete
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.remove('show');
    userToDelete = null;
  });
}

// Confirm delete
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!userToDelete) return;

    try {
      if (userToDelete.bulk) {
        // Delete multiple users
        for (const userId of userToDelete.ids) {
          await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        }
        alert(`Successfully deleted ${userToDelete.ids.length} user(s)`);
        selectedUsers.clear();
      } else {
        // Delete single user
        await apiFetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' });
        alert(`Successfully deleted ${userToDelete.name}`);
      }

      deleteModal.classList.remove('show');
      userToDelete = null;
      
      // Reload data
      await loadData();
      updateBulkActions();
    } catch (err) {
      alert('Error deleting user(s): ' + err.message);
    }
  });
}

// Close modal on outside click
if (deleteModal) {
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.remove('show');
      userToDelete = null;
    }
  });
}

// Show error
function showError(message) {
  usersTableBody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Error</h3>
          <p>${message}</p>
        </div>
      </td>
    </tr>
  `;
}

// Initialize
loadData();