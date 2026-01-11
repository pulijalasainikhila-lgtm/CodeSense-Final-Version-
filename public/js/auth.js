import { apiFetch, setToken, saveUser } from "./common.js";

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const errorBox = document.getElementById("form-error");

function showError(msg) {
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
  } else {
    alert(msg);
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setToken(data.token);
      saveUser(data.user);
      if(data.user.role === 'admin') {
        window.location.href = "admin.html";
      }
      else window.location.href = "dashboard.html";
    } catch (err) {
      showError(err.message);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = signupForm.name.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value.trim();

    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      setToken(data.token);
      saveUser(data.user);
      if(data.user.role === 'admin') {
        window.location.href = "admin.html";
      }
      else window.location.href = "dashboard.html";
    } catch (err) {
      showError(err.message);
    }
  });
}
