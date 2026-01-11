import { apiFetch, requireAdmin } from "./common.js";

requireAdmin();

const usersTableBody = document.getElementById("users-body");
const statsBox = document.getElementById("stats");

async function loadStats() {
  try {
    const data = await apiFetch("/api/admin/stats");
    if (!statsBox) return;
    const byTypeStr = (data.byType || [])
      .map(t => `${t._id}: ${t.count}`)
      .join(", ");
    statsBox.textContent = `Users: ${data.totalUsers} • History entries: ${data.totalHistory} • ${byTypeStr}`;
  } catch (err) {
    if (statsBox) statsBox.textContent = "Error: " + err.message;
  }
}

async function loadUsers() {
  try {
    const users = await apiFetch("/api/admin/users");
    if (!usersTableBody) return;
    usersTableBody.innerHTML = "";
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td><button data-id="${u._id}" class="danger-btn">Delete</button></td>
      `;
      usersTableBody.appendChild(tr);
    });

    usersTableBody.addEventListener("click", async (e) => {
      const target = e.target;
      if (target.matches("button[data-id]")) {
        const id = target.getAttribute("data-id");
        if (!confirm("Delete this user and their history?")) return;
        await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
        loadUsers();
      }
    });
  } catch (err) {
    if (usersTableBody) {
      usersTableBody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
    }
  }
}

loadStats();
loadUsers();
