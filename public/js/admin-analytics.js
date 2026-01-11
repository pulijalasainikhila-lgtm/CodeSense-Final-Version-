import { apiFetch, requireAdmin } from "./common.js";

requireAdmin();

let languageTrendsChart = null;
let monthlyRequestsChart = null;
let featureUsageChart = null;
let allUsers = [];
let currentFilter = 'all';

// Load all analytics data
async function loadAnalytics() {
  try {
    // Load admin stats
    const statsData = await apiFetch("/api/admin/stats");
    updateOverviewStats(statsData);

    // Load all users for the table
    const users = await apiFetch("/api/admin/users");
    allUsers = users;
    renderUsersTable(users);

    // Create charts with the data
    createCharts(statsData);
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

// Update overview statistics cards
function updateOverviewStats(data) {
  document.getElementById('total-users').textContent = data.totalUsers || 0;
  document.getElementById('total-searches').textContent = data.totalHistory || 0;
  
  // Calculate code analysis (explain + convert)
  const codeAnalysis = (data.byType || []).reduce((sum, item) => sum + item.count, 0);
  document.getElementById('code-analysis').textContent = formatNumber(codeAnalysis);
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Render users table
function renderUsersTable(users) {
  const tbody = document.getElementById('users-body');
  
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p>No users found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="tag">${user.role}</span></td>
      <td>${new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
      <td>
        <button class="danger-btn" data-id="${user._id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Add delete event listeners
  tbody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.target.getAttribute('data-id');
      if (confirm('Delete this user and their history?')) {
        try {
          await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          loadAnalytics(); // Reload data
        } catch (err) {
          alert('Error deleting user: ' + err.message);
        }
      }
    });
  });
}

// Create charts
function createCharts(statsData) {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    loadChartJS();
    return;
  }

  createLanguageTrendsChart();
  createMonthlyRequestsChart(statsData);
  createFeatureUsageChart(statsData);
}

// Language Trends Chart (Area Chart)
function createLanguageTrendsChart() {
  const canvas = document.getElementById('language-trends-chart');
  const ctx = canvas.getContext('2d');

  if (languageTrendsChart) {
    languageTrendsChart.destroy();
  }

  // Sample data - replace with real data from your API
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  
  languageTrendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Python',
          data: [1200, 1350, 1500, 1380, 1450, 1300, 1550],
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'JavaScript',
          data: [750, 820, 1000, 980, 920, 900, 1050],
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Java',
          data: [400, 450, 520, 510, 530, 480, 550],
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'C++',
          data: [300, 280, 320, 310, 290, 305, 330],
          borderColor: 'rgba(236, 72, 153, 1)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#9ca3af',
            stepSize: 300
          },
          grid: {
            color: 'rgba(31, 41, 55, 0.3)'
          }
        },
        x: {
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Monthly Requests Chart (Stacked Bar Chart)
function createMonthlyRequestsChart(statsData) {
  const canvas = document.getElementById('monthly-requests-chart');
  const ctx = canvas.getContext('2d');

  if (monthlyRequestsChart) {
    monthlyRequestsChart.destroy();
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  
  monthlyRequestsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Python',
          data: [30, 35, 40, 42, 45, 50, 55],
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
        },
        {
          label: 'JavaScript',
          data: [25, 28, 30, 32, 35, 38, 42],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        },
        {
          label: 'Java',
          data: [15, 18, 20, 22, 20, 23, 25],
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
        },
        {
          label: 'C++',
          data: [10, 12, 15, 14, 13, 15, 18],
          backgroundColor: 'rgba(236, 72, 153, 0.8)',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(31, 41, 55, 0.3)'
          }
        }
      }
    }
  });
}

// Feature Usage Chart (Line Chart)
function createFeatureUsageChart(statsData) {
  const canvas = document.getElementById('feature-usage-chart');
  const ctx = canvas.getContext('2d');

  if (featureUsageChart) {
    featureUsageChart.destroy();
  }

  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Generate sample data
  const explainData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 30);
  const convertData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 40) + 20);

  featureUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Explain Code',
          data: explainData,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'Convert Code',
          data: convertData,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#9ca3af',
            stepSize: 20
          },
          grid: {
            color: 'rgba(31, 41, 55, 0.3)'
          }
        },
        x: {
          ticks: {
            color: '#9ca3af',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Search functionality
const searchInput = document.getElementById('user-search');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
    renderUsersTable(applyFilter(filtered));
  });
}

// Filter functionality
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    filterButtons.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter');
    const searchQuery = searchInput.value.toLowerCase();
    let filtered = allUsers;
    
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery) ||
        user.email.toLowerCase().includes(searchQuery)
      );
    }
    
    renderUsersTable(applyFilter(filtered));
  });
});

function applyFilter(users) {
  if (currentFilter === 'all') return users;
  return users.filter(user => user.role === currentFilter);
}

// Load Chart.js if not available
function loadChartJS() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  script.onload = () => {
    loadAnalytics();
  };
  document.head.appendChild(script);
}

// Initialize
if (typeof Chart === 'undefined') {
  loadChartJS();
} else {
  loadAnalytics();
}