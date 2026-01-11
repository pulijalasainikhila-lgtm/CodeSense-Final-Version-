const API_BASE_URL = "http://localhost:5000";

const loader = document.getElementById("global-loader");

export function showLoader() {
  if (loader) loader.classList.add("show");
}

export function hideLoader() {
  if (loader) loader.classList.remove("show");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
  }
}

export function requireAdmin() {
  requireAuth();
  const user = getUser();
  if (!user || user.role !== "admin") {
    window.location.href = "dashboard.html";
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
};

  showLoader();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  } finally {
    hideLoader();
  }
}

// Add these functions to your common.js file

// Theme Management
export function getTheme() {
  return localStorage.getItem("theme") || "dark";
}

export function setTheme(theme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const current = getTheme();
  const newTheme = current === "dark" ? "light" : "dark";
  setTheme(newTheme);
  return newTheme;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Initialize theme on page load
export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
  
  // Update toggle button if it exists
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    updateThemeToggleButton(themeToggle, theme);
  }
}

function updateThemeToggleButton(button, theme) {
  const icon = button.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

// Auto-initialize theme when common.js loads
if (typeof window !== 'undefined') {
  initTheme();
}