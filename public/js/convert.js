import { apiFetch, requireAuth } from "./common.js";

requireAuth();

const form = document.getElementById("convert-form");
const codeInput = document.getElementById("code");
const fromSelect = document.getElementById("fromLanguage");
const toSelect = document.getElementById("toLanguage");
const output = document.getElementById("convert-output");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    const fromLanguage = fromSelect.value;
    const toLanguage = toSelect.value;
    if (!code) return;

    try {
      const data = await apiFetch("/api/groq/convert", {
        method: "POST",
        body: JSON.stringify({ code, fromLanguage, toLanguage })
      });
      output.textContent = data.result;
    } catch (err) {
      output.textContent = "Error: " + err.message;
    }
  });
}
