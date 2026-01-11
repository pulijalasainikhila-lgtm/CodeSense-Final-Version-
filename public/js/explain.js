import { apiFetch, requireAuth } from "./common.js";

requireAuth();

const form = document.getElementById("explain-form");
const codeInput = document.getElementById("code");
const languageSelect = document.getElementById("language");
const output = document.getElementById("explain-output");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    const language = languageSelect.value;

    if (!code) return;

    try {
      const data = await apiFetch("/api/groq/explain", {
        method: "POST",
        body: JSON.stringify({ code, language })
      });
      output.textContent = data.result;
    } catch (err) {
      output.textContent = "Error: " + err.message;
    }
  });
}
