(function () {
  const OFFICES = ["All Offices", "KSA", "EG", "UAE", "Kuwait"];
  const DEFAULT_ROWS = [
    ["KSA", "Enterprise renewal", "TryGC Riyadh", "Pipeline", "High", "Review proposal", "Open"],
    ["KSA", "Q1 collection", "Jeddah Office", "Contracts", "Medium", "Confirm payment date", "Open"],
    ["EG", "New prospect", "Cairo Growth Co.", "Pipeline", "Medium", "Schedule discovery call", "Open"],
    ["EG", "Rep onboarding", "Egypt Sales Desk", "Sales Team", "Low", "Update monthly target", "Draft"],
    ["UAE", "Expansion quote", "Dubai Holding", "Revenue", "High", "Adjust forecast amount", "Open"],
    ["UAE", "Commission check", "Abu Dhabi Desk", "Commissions", "Medium", "Validate tier payout", "Open"],
    ["Kuwait", "Contract renewal", "Kuwait City Client", "Contracts", "High", "Send renewal terms", "Open"],
    ["Kuwait", "Lost reason review", "Kuwait Pipeline", "Lost Analysis", "Low", "Add competitor notes", "Draft"]
  ];

  const STORAGE_KEY = "gc-workbench-state-v1";
  let state = loadState();
  let observer = null;
  let lastTitle = "";
  let syncQueued = false;

  document.addEventListener("DOMContentLoaded", boot);

  function boot() {
    renderShell();
    observer = new MutationObserver(queueSync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", syncWorkbench);
    setInterval(syncWorkbench, 1200);
    syncWorkbench();
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(() => {
      syncQueued = false;
      syncWorkbench();
    });
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        office: saved.office || "All Offices",
        search: saved.search || "",
        mode: saved.mode || "Excel View",
        gridOpen: saved.gridOpen !== false,
        rows: Array.isArray(saved.rows) && saved.rows.length ? saved.rows : DEFAULT_ROWS
      };
    } catch (_error) {
      return { office: "All Offices", search: "", mode: "Excel View", gridOpen: true, rows: DEFAULT_ROWS };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderShell() {
    if (!document.getElementById("gc-workbench")) {
      const toolbar = document.createElement("section");
      toolbar.id = "gc-workbench";
      toolbar.className = "gc-workbench";
      toolbar.innerHTML = `
        <div class="gc-workbench-row">
          <div class="gc-workbench-title">
            <strong>Daily Workspace</strong>
            <span id="gc-workbench-context">Excel-first view for day-to-day work</span>
          </div>
          <div>
            <label for="gc-office-filter">Office</label>
            <select id="gc-office-filter">
              ${OFFICES.map((office) => `<option value="${office}">${office}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="gc-view-mode">Working mode</label>
            <select id="gc-view-mode">
              <option>Excel View</option>
              <option>Dashboard View</option>
            </select>
          </div>
          <div>
            <label for="gc-workbench-search">Filter current work</label>
            <input id="gc-workbench-search" type="search" placeholder="Search company, page, action">
          </div>
          <button class="gc-workbench-button secondary" id="gc-toggle-grid" type="button">Hide Grid</button>
          <button class="gc-workbench-button" id="gc-export-grid" type="button">Export CSV</button>
        </div>
      `;
      document.body.appendChild(toolbar);
    }

    if (!document.getElementById("gc-workbench-grid")) {
      const grid = document.createElement("section");
      grid.id = "gc-workbench-grid";
      grid.className = "gc-workbench-grid";
      grid.innerHTML = `
        <div class="gc-workbench-grid-head">
          <div>
            <strong>Editable Workspace Grid</strong>
            <span id="gc-grid-summary">Saved locally in this browser</span>
          </div>
          <button class="gc-workbench-button secondary" id="gc-add-row" type="button">Add Row</button>
        </div>
        <div class="gc-workbench-table-wrap">
          <table class="gc-workbench-table">
            <thead>
              <tr>
                <th>Office</th>
                <th>Work item</th>
                <th>Account</th>
                <th>Page</th>
                <th>Priority</th>
                <th>Next action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="gc-workbench-rows"></tbody>
          </table>
        </div>
      `;
      document.body.appendChild(grid);
    }

    bindControls();
    renderRows();
  }

  function bindControls() {
    const office = document.getElementById("gc-office-filter");
    const mode = document.getElementById("gc-view-mode");
    const search = document.getElementById("gc-workbench-search");
    const toggle = document.getElementById("gc-toggle-grid");
    const exportButton = document.getElementById("gc-export-grid");
    const addRow = document.getElementById("gc-add-row");

    office.value = state.office;
    mode.value = state.mode;
    search.value = state.search;

    office.addEventListener("change", () => {
      state.office = office.value;
      saveState();
      syncWorkbench();
      renderRows();
    });
    mode.addEventListener("change", () => {
      state.mode = mode.value;
      saveState();
      syncWorkbench();
    });
    search.addEventListener("input", () => {
      state.search = search.value;
      saveState();
      renderRows();
    });
    toggle.addEventListener("click", () => {
      state.gridOpen = !state.gridOpen;
      saveState();
      syncWorkbench();
    });
    exportButton.addEventListener("click", exportRows);
    addRow.addEventListener("click", () => {
      const title = getActiveTitle() || "Overview";
      state.rows.unshift([state.office === "All Offices" ? "KSA" : state.office, "New work item", "", title, "Medium", "Add next action", "Draft"]);
      saveState();
      renderRows();
    });
  }

  function syncWorkbench() {
    if (!document.body.classList.contains("gc-authenticated")) return;

    document.body.classList.toggle("gc-workbench-grid-open", state.gridOpen);
    const toggle = document.getElementById("gc-toggle-grid");
    if (toggle) toggle.textContent = state.gridOpen ? "Hide Grid" : "Show Grid";

    const title = getActiveTitle();
    if (title && title !== lastTitle) {
      lastTitle = title;
      renderRows();
      if (state.mode === "Excel View") setTimeout(forceExcelView, 120);
    }

    updateOfficeLabels();
    refineLayout();
  }

  function getActiveTitle() {
    const headerTitle = document.querySelector("header span");
    return headerTitle ? headerTitle.textContent.trim() : "";
  }

  function forceExcelView() {
    const buttons = Array.from(document.querySelectorAll("button"));
    const excelButton = buttons.find((button) => /excel/i.test(button.textContent || ""));
    if (excelButton && !/primary|active/i.test(excelButton.className || "")) {
      excelButton.click();
    }
  }

  function updateOfficeLabels() {
    const context = document.getElementById("gc-workbench-context");
    const title = getActiveTitle() || "Dashboard";
    if (context) context.textContent = `${title} - ${state.office} - editable and filterable`;

    document.querySelectorAll("header .badge, header span").forEach((node) => {
      if ((node.textContent || "").includes("GC KSA")) {
        const label = `GC ${state.office === "All Offices" ? "All Offices" : state.office} - Q1 2026`;
        if (node.textContent !== label) node.textContent = label;
        node.classList.add("gc-office-pill");
      }
    });
  }

  function refineLayout() {
    document.querySelectorAll(".card").forEach((card) => {
      card.style.borderRadius = "8px";
    });
  }

  function renderRows() {
    const tbody = document.getElementById("gc-workbench-rows");
    if (!tbody) return;

    const title = getActiveTitle();
    const term = state.search.trim().toLowerCase();
    const rows = state.rows.filter((row) => {
      const officeMatch = state.office === "All Offices" || row[0] === state.office;
      const titleMatch = !title || row[3] === title || title === "Executive Overview";
      const termMatch = !term || row.join(" ").toLowerCase().includes(term);
      return officeMatch && titleMatch && termMatch;
    });

    tbody.innerHTML = rows.map((row) => {
      const index = state.rows.indexOf(row);
      return `
        <tr data-row-index="${index}">
          ${row.map((cell, colIndex) => `
            <td contenteditable="true" data-col-index="${colIndex}">${escapeHtml(cell)}</td>
          `).join("")}
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("td").forEach((cell) => {
      cell.addEventListener("blur", () => {
        const row = Number(cell.parentElement.dataset.rowIndex);
        const col = Number(cell.dataset.colIndex);
        state.rows[row][col] = cell.textContent.trim();
        saveState();
      });
    });

    const summary = document.getElementById("gc-grid-summary");
    if (summary) summary.textContent = `${rows.length} visible rows - edits save automatically`;
  }

  function exportRows() {
    const visibleRows = Array.from(document.querySelectorAll("#gc-workbench-rows tr")).map((tr) => {
      return Array.from(tr.children).map((td) => td.textContent.trim());
    });
    const header = ["Office", "Work item", "Account", "Page", "Priority", "Next action", "Status"];
    const csv = [header, ...visibleRows].map((row) => {
      return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trygc-workspace-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
