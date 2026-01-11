import { apiFetch, requireAuth } from "./common.js";

requireAuth();

// Chart.js CDN is loaded via the HTML or assumed to be available
// If not available, we'll create basic visualizations

let featureChart = null;
let languagePieChart = null;

async function loadStatistics() {
  try {
    const data = await apiFetch("/api/history");
    
    if (!Array.isArray(data)) return;

    // Calculate statistics
    const totalActions = data.length;
    
    // Count by type (explain, convert, etc.)
    const typeCount = {};
    data.forEach(item => {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
    });

    // Count languages
    const languageCount = {};
    data.forEach(item => {
      if (item.language) {
        languageCount[item.language] = (languageCount[item.language] || 0) + 1;
      }
      if (item.targetLanguage && item.targetLanguage !== item.language) {
        languageCount[item.targetLanguage] = (languageCount[item.targetLanguage] || 0) + 1;
      }
    });

    const uniqueLanguages = Object.keys(languageCount).length;
    
    // Find most used feature
    let mostUsedFeature = '-';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCount)) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedFeature = type.charAt(0).toUpperCase() + type.slice(1);
      }
    }

    // Update stat cards
    document.getElementById('total-actions').textContent = totalActions;
    document.getElementById('languages-used').textContent = uniqueLanguages;
    document.getElementById('most-used').textContent = mostUsedFeature;

    // Create charts
    createFeatureChart(typeCount);
    createLanguagePieChart(languageCount);

  } catch (err) {
    console.error('Error loading statistics:', err);
  }
}

function createFeatureChart(typeCount) {
  const canvas = document.getElementById('feature-chart');
  const ctx = canvas.getContext('2d');
  
  // Check if Chart.js is available
  if (typeof Chart !== 'undefined') {
    // Destroy existing chart if it exists
    if (featureChart) {
      featureChart.destroy();
    }

    const labels = Object.keys(typeCount).map(t => t.charAt(0).toUpperCase() + t.slice(1));
    const values = Object.values(typeCount);

    featureChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'count',
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: 8,
        }]
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
              font: {
                size: 12
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#9ca3af',
              stepSize: 1
            },
            grid: {
              color: 'rgba(31, 41, 55, 0.5)'
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
  } else {
    // Fallback: Create a simple bar chart without Chart.js
    createSimpleBarChart(canvas, typeCount);
  }
}

function createLanguagePieChart(languageCount) {
  const canvas = document.getElementById('language-pie-chart');
  const ctx = canvas.getContext('2d');
  const legend = document.getElementById('language-legend');

  if (typeof Chart !== 'undefined') {
    // Destroy existing chart if it exists
    if (languagePieChart) {
      languagePieChart.destroy();
    }

    const labels = Object.keys(languageCount);
    const values = Object.values(languageCount);
    const total = values.reduce((a, b) => a + b, 0);

    const colors = [
      'rgba(99, 102, 241, 0.8)',   // Blue
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(245, 158, 11, 0.8)',   // Yellow
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(139, 92, 246, 0.8)',   // Purple
    ];

    languagePieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#0a0e27',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const percentage = ((context.parsed / total) * 100).toFixed(0);
                return `${context.label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });

    // Create custom legend
    legend.innerHTML = '';
    labels.forEach((label, index) => {
      const percentage = ((values[index] / total) * 100).toFixed(0);
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <span class="legend-color" style="background-color: ${colors[index]}"></span>
        <span class="legend-label">${label}</span>
        <span class="legend-value">${values[index]} uses</span>
      `;
      legend.appendChild(legendItem);
    });

    // Add percentage labels on pie chart
    if (labels.length > 0) {
      const largest = labels[values.indexOf(Math.max(...values))];
      const largestPercent = ((Math.max(...values) / total) * 100).toFixed(0);
      // You can add custom labels here if needed
    }

  } else {
    // Fallback: Create a simple representation
    createSimplePieChart(canvas, languageCount);
  }
}

function createSimpleBarChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const entries = Object.entries(data);
  const maxValue = Math.max(...Object.values(data));
  const barWidth = width / (entries.length * 2);
  const barSpacing = barWidth;
  
  entries.forEach(([label, value], index) => {
    const barHeight = (value / maxValue) * (height - 40);
    const x = index * (barWidth + barSpacing) + barSpacing;
    const y = height - barHeight - 20;
    
    // Draw bar
    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Draw label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barWidth / 2, height - 5);
    
    // Draw value
    ctx.fillText(value, x + barWidth / 2, y - 5);
  });
}

function createSimplePieChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const entries = Object.entries(data);
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  
  const colors = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(139, 92, 246, 0.8)',
  ];
  
  let currentAngle = -Math.PI / 2;
  
  entries.forEach(([label, value], index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    
    currentAngle += sliceAngle;
  });
}

// Load Chart.js dynamically if not available
if (typeof Chart === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  script.onload = () => {
    loadStatistics();
  };
  document.head.appendChild(script);
} else {
  loadStatistics();
}

// If Chart.js fails to load, still run with fallback
setTimeout(() => {
  if (typeof Chart === 'undefined') {
    loadStatistics();
  }
}, 2000);