(function () {
  const ROLE_FEATURES = {
    admin: [
      "Overview",
      "Pipeline",
      "Kanban Board",
      "Client Directory",
      "Contracts",
      "Revenue",
      "Commissions",
      "Sales Team",
      "Agent Performance",
      "Goals & OKRs",
      "Activity Planner",
      "Lost Analysis",
      "Forecast",
      "Data Import",
      "QA Controls",
      "Audit Log",
      "Settings"
    ],
    manager: [
      "Overview",
      "Pipeline",
      "Kanban Board",
      "Client Directory",
      "Contracts",
      "Revenue",
      "Commissions",
      "Sales Team",
      "Agent Performance",
      "Goals & OKRs",
      "Activity Planner",
      "Lost Analysis",
      "Forecast",
      "Data Import",
      "QA Controls"
    ],
    sales: [
      "Overview",
      "Pipeline",
      "Kanban Board",
      "Client Directory",
      "Activity Planner"
    ],
    finance: ["Overview", "Contracts", "Revenue", "Commissions"]
  };

  const ROLE_LABELS = {
    admin: "Admin",
    manager: "Manager",
    sales: "Sales",
    finance: "Finance"
  };

  const DEMO_USERS = [
    { role: "admin", label: "Admin", email: "admin.demo@try-gc.com", password: "Demo@12345" },
    { role: "manager", label: "Manager", email: "manager.demo@try-gc.com", password: "Demo@12345" },
    { role: "sales", label: "Sales", email: "sales.demo@try-gc.com", password: "Demo@12345" },
    { role: "finance", label: "Finance", email: "finance.demo@try-gc.com", password: "Demo@12345" }
  ];

  const PAGE_TITLES = {
    Overview: "Executive Overview",
    Pipeline: "Pipeline Analytics",
    "Kanban Board": "Kanban Board",
    "Client Directory": "Client Directory",
    Contracts: "Contracts & Collections",
    Revenue: "Revenue Analytics",
    Commissions: "Commissions Center",
    "Sales Team": "Sales Team",
    "Agent Performance": "Agent Performance",
    "Goals & OKRs": "Goals & OKRs",
    "Activity Planner": "Activity Planner",
    "Lost Analysis": "Lost Deal Analysis",
    Forecast: "Forecast & Scenarios",
    "Data Import": "Data Import",
    "QA Controls": "QA Controls",
    "Audit Log": "Audit Log & Backups",
    Settings: "Settings"
  };

  let supabaseClient = null;
  let currentRole = null;
  let currentUser = null;
  let observer = null;

  document.body.classList.add("gc-auth-pending");
  renderAuthShell();

  window.addEventListener("DOMContentLoaded", init);

  async function init() {
    const config = window.GC_SUPABASE_CONFIG || {};
    if (!config.url || !config.anonKey) {
      setMessage(
        "Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, or fill config.js for local testing.",
        "error"
      );
      document.body.classList.add("gc-auth-blocked");
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      setMessage("Supabase client failed to load. Check the network connection and reload.", "error");
      document.body.classList.add("gc-auth-blocked");
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);

    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      await unlock(data.session.user);
    } else {
      document.body.classList.add("gc-auth-blocked");
      document.body.classList.remove("gc-auth-pending");
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        unlock(session.user);
      } else {
        lock();
      }
    });
  }

  function renderAuthShell() {
    const root = document.getElementById("gc-auth-root");
    if (!root) return;

    root.innerHTML = `
      <section class="gc-auth-screen" aria-label="Sign in">
        <form class="gc-auth-panel" id="gc-auth-form">
          <div class="gc-auth-logo">G</div>
          <h1 class="gc-auth-title">Sign in to TryGC KSA</h1>
          <p class="gc-auth-copy">Use your dashboard account to continue.</p>
          <label class="gc-auth-field">
            <span class="gc-auth-label">Email</span>
            <input class="gc-auth-input" id="gc-auth-email" type="email" autocomplete="email" required>
          </label>
          <label class="gc-auth-field">
            <span class="gc-auth-label">Password</span>
            <input class="gc-auth-input" id="gc-auth-password" type="password" autocomplete="current-password" required>
          </label>
          <button class="gc-auth-button" id="gc-auth-submit" type="submit">Sign in</button>
          <button class="gc-auth-button gc-auth-secondary" id="gc-auth-signup" type="button">Create sales account</button>
          <div class="gc-demo-users" aria-label="Demo accounts">
            <p>Demo access</p>
            <div>
              ${DEMO_USERS.map((user) => `
                <button class="gc-demo-button" type="button" data-demo-role="${user.role}">
                  Try as ${user.label}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="gc-auth-message" id="gc-auth-message" role="status"></div>
          <p class="gc-auth-meta">Roles are read from Supabase user metadata: admin, manager, sales, or finance.</p>
        </form>
      </section>
    `;

    root.querySelector("#gc-auth-form").addEventListener("submit", signIn);
    root.querySelector("#gc-auth-signup").addEventListener("click", signUp);
    root.querySelectorAll(".gc-demo-button").forEach((button) => {
      button.addEventListener("click", () => {
        const demoUser = DEMO_USERS.find((user) => user.role === button.dataset.demoRole);
        if (demoUser) signInWithCredentials(demoUser.email, demoUser.password);
      });
    });
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = document.getElementById("gc-auth-email").value.trim();
    const password = document.getElementById("gc-auth-password").value;
    await signInWithCredentials(email, password);
  }

  async function signInWithCredentials(email, password) {
    if (!supabaseClient) {
      setMessage("Supabase is still loading. Refresh the page and try again.", "error");
      return;
    }

    setBusy(true);
    setMessage("", "info");

    try {
      const signInPromise = supabaseClient.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ error: new Error("Sign-in timed out. Check the connection and try again.") }), 15000);
      });
      const { error } = await Promise.race([signInPromise, timeoutPromise]);

      if (error) {
        setMessage(error.message, "error");
      }
    } catch (error) {
      setMessage(error && error.message ? error.message : "Sign-in failed. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    if (!supabaseClient) return;

    const email = document.getElementById("gc-auth-email").value.trim();
    const password = document.getElementById("gc-auth-password").value;

    if (!email || !password) {
      setMessage("Enter an email and password before creating an account.", "error");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "sales"
          }
        }
      });

      if (error) {
        setMessage(error.message, "error");
        return;
      }

      setMessage("Account created. Check your email if confirmation is enabled.", "info");
    } catch (error) {
      setMessage(error && error.message ? error.message : "Account creation failed. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(user) {
    currentUser = user;
    currentRole = normalizeRole(user.user_metadata && user.user_metadata.role);

    document.body.classList.remove("gc-auth-pending", "gc-auth-blocked");
    document.body.classList.add("gc-authenticated");

    const root = document.getElementById("gc-auth-root");
    if (root) root.innerHTML = "";

    renderUserBar();
    applyRoleAccess();

    if (!observer) {
      observer = new MutationObserver(applyRoleAccess);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function lock() {
    currentUser = null;
    currentRole = null;
    document.body.classList.add("gc-auth-blocked");
    document.body.classList.remove("gc-authenticated");
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    renderAuthShell();
  }

  function normalizeRole(role) {
    return Object.prototype.hasOwnProperty.call(ROLE_FEATURES, role) ? role : "sales";
  }

  function renderUserBar() {
    let bar = document.getElementById("gc-auth-userbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "gc-auth-userbar";
      bar.className = "gc-auth-userbar";
      document.body.appendChild(bar);
    }

    const email = currentUser && currentUser.email ? currentUser.email : "Signed in";
    bar.innerHTML = `
      <span>${escapeHtml(email)} · ${ROLE_LABELS[currentRole]}</span>
      <button type="button" id="gc-auth-signout">Sign out</button>
    `;
    bar.querySelector("button").addEventListener("click", () => supabaseClient.auth.signOut());
  }

  function applyRoleAccess() {
    if (!currentRole) return;

    const allowed = new Set(ROLE_FEATURES[currentRole]);
    document.querySelectorAll("nav button").forEach((button) => {
      const label = getButtonLabel(button);
      if (!label) return;
      button.classList.toggle("gc-role-hidden", !allowed.has(label));
    });

    document.querySelectorAll("button").forEach((button) => {
      const text = getButtonLabel(button);
      if (text === "+ Import Data") {
        button.classList.toggle("gc-role-hidden", !allowed.has("Data Import"));
      }
      if (text === "⬇ Export") {
        button.classList.toggle("gc-role-hidden", !(currentRole === "admin" || currentRole === "manager" || currentRole === "finance"));
      }
    });

    const activeTitle = getActiveTitle();
    const allowedTitles = new Set(Array.from(allowed).map((feature) => PAGE_TITLES[feature] || feature));
    if (activeTitle && !allowedTitles.has(activeTitle) && activeTitle !== "Deal Detail") {
      const firstAllowedButton = Array.from(document.querySelectorAll("nav button")).find((button) => {
        return allowed.has(getButtonLabel(button));
      });
      if (firstAllowedButton) firstAllowedButton.click();
    }
  }

  function getButtonLabel(button) {
    return (button.textContent || "").replace(/^[^\w+]+/u, "").trim();
  }

  function getActiveTitle() {
    const header = document.querySelector("header span");
    return header ? header.textContent.trim() : "";
  }

  function setBusy(isBusy) {
    const submit = document.getElementById("gc-auth-submit");
    const signup = document.getElementById("gc-auth-signup");
    if (submit) {
      submit.disabled = isBusy;
      submit.textContent = isBusy ? "Working..." : "Sign in";
    }
    if (signup) signup.disabled = isBusy;
  }

  function setMessage(message, type) {
    const node = document.getElementById("gc-auth-message");
    if (!node) return;
    node.textContent = message;
    node.className = `gc-auth-message${message ? " is-visible" : ""} is-${type}`;
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
