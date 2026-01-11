import { apiFetch, requireAuth } from "./common.js";

requireAuth();

const list = document.getElementById("history-list");

async function loadHistory() {
  try {
    const data = await apiFetch("/api/history");
    if (!Array.isArray(data) || !list) return;
    list.innerHTML = "";
    data.forEach(item => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div class="history-meta">
          <span class="tag">${item.type}</span>
          <span class="lang">${item.language || ""}${item.targetLanguage ? " → " + item.targetLanguage : ""}</span>
          <span class="time">${new Date(item.createdAt).toLocaleString()}</span>
        </div>
        <pre class="code-snippet">${(item.inputCode || "")}</pre>
        <pre class="result-snippet">${(item.result || "")}</pre>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    if (list) list.textContent = "Error: " + err.message;
  }
}

loadHistory();
