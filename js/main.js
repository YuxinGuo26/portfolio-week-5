/* ============================================================
   Alex Chen — Personal Website interactions
   Vanilla JS, no dependencies · shared across all pages
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Current year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  var header = document.getElementById("site-header");

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");

  if (navToggle && siteNav) {
    function closeMenu() {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }

    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close the drawer after choosing a link (mobile)
    siteNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    // Close when clicking outside
    document.addEventListener("click", function (event) {
      if (
        siteNav.classList.contains("is-open") &&
        !siteNav.contains(event.target) &&
        !navToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  /* ---------- Scroll-reveal animations ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  // Cascade hero items on the homepage
  var heroReveals = document.querySelectorAll(".home-hero-inner .reveal");
  heroReveals.forEach(function (el, i) {
    el.style.setProperty("--reveal-delay", i * 0.08 + "s");
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Contact form ----------
     No backend: builds a pre-filled email to the QQ mailbox and
     opens the visitor's email client (QQ Mail, Outlook, Gmail, …). */
  var form = document.getElementById("contact-form");
  var formNote = document.getElementById("form-note");
  var CONTACT_EMAIL = "2984978189@qq.com";

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      var subject = form.querySelector("#subject");
      var message = form.querySelector("#message");

      // Light validation
      var valid = true;
      [name, email, message].forEach(function (field) {
        if (field && !field.value.trim()) {
          valid = false;
          field.style.borderColor = "#e07856";
        } else if (field) {
          field.style.borderColor = "";
        }
      });

      var emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (email.value.trim() && !emailLooksValid) {
        valid = false;
        email.style.borderColor = "#e07856";
      }

      if (!valid) {
        if (formNote) {
          formNote.textContent = "Please fill in your name, a valid email, and a message.";
          formNote.style.color = "#c9613f";
        }
        return;
      }

      var senderName = name.value.trim();
      var senderEmail = email.value.trim();
      var subjectText =
        subject && subject.value.trim()
          ? subject.value.trim()
          : "Message from " + senderName + " via your website";
      var bodyText =
        "Hi Yuxin,\n\n" +
        message.value.trim() +
        "\n\n— " + senderName + "\nReply-to: " + senderEmail;

      var mailto =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subjectText) +
        "&body=" + encodeURIComponent(bodyText);

      if (formNote) {
        formNote.textContent =
          "Opening your email app with everything filled in… if it doesn't open, write to " +
          CONTACT_EMAIL + " directly. 🌿";
        formNote.style.color = "";
      }

      window.location.href = mailto;
      form.reset();
    });
  }
  /* ---------- To-Do List App (Supabase-backed) ---------- */
  var todoList = document.getElementById("todo-list");
  var todoInput = document.getElementById("todo-text");
  var dateInput = document.getElementById("todo-date");
  var addBtn = document.getElementById("todo-add");
  var emptyMsg = document.getElementById("todo-empty");
  var countEl = document.getElementById("todo-count");
  var clearBtn = document.getElementById("todo-clear");
  var statusEl = document.getElementById("todo-status");
  var filterBtns = document.querySelectorAll(".todo-filter");
  var emojiBtns = document.querySelectorAll(".emoji-btn");
  var priorityBtns = document.querySelectorAll(".priority-btn");
  var selectedEmoji = "\u{1F4CC}";
  var selectedPriority = "medium";

  // --- Supabase init ---
  var SUPABASE_URL = "https://ggpjvtbxyqrbpglilmyb.supabase.co";
  var SUPABASE_KEY = "sb_publishable_VTPSLEjFJItLJnWPnYT5qA_Qzxv2KRK";
  var sb = null;
  var sdkReady = false;
  var sdkLoading = null; // promise

  var SDK_CDNS = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.0/supabase.min.js"
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadSupabaseSDK() {
    if (sdkLoading) return sdkLoading;
    sdkLoading = (async function () {
      for (var i = 0; i < SDK_CDNS.length; i++) {
        try {
          console.log("[todo] trying CDN:", SDK_CDNS[i]);
          await loadScript(SDK_CDNS[i]);
          if (window.supabase && typeof window.supabase.createClient === "function") {
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            sdkReady = true;
            console.log("[todo] Supabase SDK loaded from:", SDK_CDNS[i]);
            return true;
          }
        } catch (e) {
          console.warn("[todo] CDN failed:", SDK_CDNS[i], e);
        }
      }
      console.error("[todo] All Supabase CDNs failed.");
      return false;
    })();
    return sdkLoading;
  }

  // --- Local fallback store (used when Supabase is unreachable) ---
  var LOCAL_KEY = "yg-todo-tasks-v1";

  function localLoad() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("[todo] Could not read local tasks:", e);
      return [];
    }
  }

  function localSave(list) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("[todo] Could not persist local tasks:", e);
    }
  }

  function genId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "local-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  // fetch() throws "TypeError: Failed to fetch" for DNS / offline / CORS /
  // aborted requests — i.e. the server could not be reached at all.
  function isNetworkError(err) {
    if (!err) return false;
    var msg = String(err.message || err.name || "").toLowerCase();
    return (
      msg.indexOf("failed to fetch") !== -1 ||
      msg.indexOf("networkerror") !== -1 ||
      msg.indexOf("network request failed") !== -1 ||
      msg.indexOf("load failed") !== -1 ||
      msg.indexOf("name_not_resolved") !== -1 ||
      msg.indexOf("could not resolve") !== -1 ||
      (err.name === "TypeError" && msg.indexOf("fetch") !== -1)
    );
  }

  var OFFLINE_MESSAGE =
    "Offline mode: the cloud database is unreachable right now, so tasks are saved in this browser. They will sync again once the database is restored and the page is refreshed.";

  function showStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = false;
  }

  if (todoList && todoInput && addBtn) {
    var todos = [];
    var currentFilter = "all";
    var mode = "cloud"; // "cloud" (Supabase) | "offline" (localStorage)

    // Entered on page load: local storage is the source of truth.
    function enterOfflineFromLoad(reason) {
      mode = "offline";
      console.warn("[todo] Offline mode (localStorage). Reason:", reason);
      todos = localLoad();
      emptyMsg.textContent = "No tasks yet — let's add some magic! ✨";
      showStatus(OFFLINE_MESSAGE);
      render();
    }

    // Entered mid-session after a failed mutation: keep the current
    // in-memory list (including optimistic changes) and persist it locally.
    function switchOffline(reason) {
      mode = "offline";
      console.warn("[todo] Connection lost — switching to offline mode. Reason:", reason);
      localSave(todos);
      showStatus(OFFLINE_MESSAGE);
    }

    // --- Set today's date as default ---
    function todayStr() {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + day;
    }
    dateInput.value = todayStr();

    // --- Format date for display ---
    function formatDate(dateStr) {
      if (!dateStr) return "";
      var parts = String(dateStr).split("-");
      if (parts.length !== 3) return dateStr;
      var d = new Date(parts[0], parts[1] - 1, parts[2]);
      var opts = { month: "short", day: "numeric", year: "numeric" };
      return d.toLocaleDateString("en-US", opts);
    }

    // --- Render ---
    function render() {
      todoList.innerHTML = "";

      var visible = todos.filter(function (t) {
        if (currentFilter === "active") return !t.done;
        if (currentFilter === "done") return t.done;
        return true;
      });

      visible.forEach(function (t) {
        var li = document.createElement("li");
        li.className = "todo-item" + (t.done ? " is-done" : "");
        li.dataset.id = t.id;

        // Checkbox
        var check = document.createElement("label");
        check.className = "todo-check";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = t.done;
        cb.addEventListener("change", function () {
          toggleDone(t.id);
        });

        var box = document.createElement("span");
        box.className = "check-box";

        check.appendChild(cb);
        check.appendChild(box);

        // Emoji
        var emoji = document.createElement("span");
        emoji.className = "todo-task-emoji";
        emoji.textContent = t.emoji || "";

        // Content
        var content = document.createElement("div");
        content.className = "todo-content";

        var text = document.createElement("span");
        text.className = "todo-task-text";
        text.textContent = t.text;
        text.title = "Click to edit";
        text.style.cursor = "pointer";
        text.addEventListener("click", function () {
          startEdit(t.id, text);
        });

        var metaRow = document.createElement("div");
        metaRow.className = "todo-meta-row";

        var dateLabel = document.createElement("span");
        dateLabel.className = "todo-task-date";
        dateLabel.textContent = formatDate(t.date);
        metaRow.appendChild(dateLabel);

        if (t.priority) {
          var badge = document.createElement("span");
          badge.className = "todo-priority-badge";
          badge.dataset.priority = t.priority;
          badge.textContent = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
          metaRow.appendChild(badge);
        }

        content.appendChild(text);
        content.appendChild(metaRow);

        // Delete button
        var del = document.createElement("button");
        del.type = "button";
        del.className = "todo-delete";
        del.setAttribute("aria-label", "Delete task");
        del.textContent = "\u00d7";
        del.addEventListener("click", function () {
          removeTask(t.id, li);
        });

        li.appendChild(check);
        li.appendChild(emoji);
        li.appendChild(content);
        li.appendChild(del);
        todoList.appendChild(li);
      });

      var hasVisible = visible.length > 0;
      emptyMsg.style.display = hasVisible ? "none" : "block";

      var doneCount = todos.filter(function (t) { return t.done; }).length;
      var total = todos.length;
      countEl.textContent = doneCount + " of " + total + " tasks completed";
    }

    // --- Wait for the Supabase SDK then load todos ---
    async function ensureClient() {
      if (sdkReady) return true;
      emptyMsg.textContent = "Loading database…";
      var ok = await loadSupabaseSDK();
      return ok;
    }

    // --- Load todos from Supabase (fall back to local storage) ---
    async function loadTodos() {
      var ok = await ensureClient();
      if (!ok) {
        // SDK itself couldn't be loaded — nothing to talk to.
        enterOfflineFromLoad("Supabase SDK could not be loaded from any CDN");
        return;
      }
      emptyMsg.textContent = "Loading tasks…";

      try {
        var result = await sb
          .from("todos")
          .select("*")
          .order("created_at", { ascending: true });

        if (result.error) throw result.error;

        mode = "cloud";
        todos = (result.data || []).map(function (row) {
          return {
            id: row.id,
            text: row.task || row.text || "",
            date: row.date || "",
            done: !!row.is_complete,
            emoji: row.emoji || "",
            priority: row.priority || "medium"
          };
        });
        render();
      } catch (err) {
        console.error("[todo] Failed to load tasks from Supabase:", err);
        if (isNetworkError(err)) {
          // Project paused/deleted, DNS failure, or visitor is offline.
          enterOfflineFromLoad(err);
        } else {
          emptyMsg.textContent = "Could not load tasks: " + (err.message || "unknown error");
        }
      }
    }

    // --- Add task ---
    async function addTask() {
      var text = todoInput.value.trim();
      if (!text) {
        todoInput.style.borderColor = "#e07856";
        todoInput.focus();
        setTimeout(function () { todoInput.style.borderColor = ""; }, 1200);
        return;
      }

      // In cloud mode, make sure the SDK is ready; if it isn't, degrade
      // gracefully to local storage instead of blocking the user.
      if (mode === "cloud" && !sdkReady) {
        var ready = await ensureClient();
        if (!ready) enterOfflineFromLoad("Supabase SDK could not be loaded from any CDN");
      }

      addBtn.disabled = true;
      addBtn.textContent = "Adding…";

      var saved = false;
      try {
        var taskDate = dateInput.value || todayStr();

        if (mode === "offline") {
          todos.push({
            id: genId(),
            text: text,
            date: taskDate,
            done: false,
            emoji: selectedEmoji,
            priority: selectedPriority
          });
          localSave(todos);
          saved = true;
        } else {
          saved = await insertTaskRemotely(text, taskDate);
        }

        if (saved) {
          render();
          todoInput.value = "";
          todoInput.focus();
        }
      } catch (err) {
        // Detailed log for debugging; keep the typed text so nothing is lost.
        console.error("[todo] addTask failed — could not save task:", err);
        alert("Could not save task: " + (err && err.message ? err.message : "Unknown error"));
        todoInput.focus();
      } finally {
        // The button must ALWAYS return to its idle state.
        addBtn.disabled = false;
        addBtn.textContent = "Add";
      }
    }

    // Insert against Supabase. Returns true on success.
    // Retries with core columns when optional columns are missing;
    // transparently switches to offline mode on network failures.
    async function insertTaskRemotely(text, taskDate) {
      var localTask = {
        id: genId(),
        text: text,
        date: taskDate,
        done: false,
        emoji: selectedEmoji,
        priority: selectedPriority
      };

      try {
        var result = await sb.from("todos").insert({
          task: text,
          date: taskDate,
          is_complete: false,
          emoji: selectedEmoji,
          priority: selectedPriority
        }).select().single();

        if (result.error) throw result.error;

        var row = result.data;
        todos.push({
          id: row.id,
          text: row.task || row.text || "",
          date: row.date || "",
          done: !!row.is_complete,
          emoji: row.emoji || selectedEmoji,
          priority: row.priority || selectedPriority
        });
        return true;
      } catch (err) {
        // Network-level failure (DNS / offline / project paused or deleted)
        if (isNetworkError(err)) {
          console.warn("[todo] Insert unreachable; keeping task locally.", err);
          todos.push(localTask);
          switchOffline(err);
          render();
          return true;
        }

        // Optional columns may not exist — retry with core columns only.
        var msg = String((err && err.message) || "").toLowerCase();
        if (msg.indexOf("column") !== -1) {
          try {
            var fallback = await sb.from("todos").insert({
              task: text,
              date: taskDate,
              is_complete: false
            }).select().single();
            if (fallback.error) throw fallback.error;

            var fr = fallback.data;
            todos.push({
              id: fr.id,
              text: fr.task || fr.text || "",
              date: fr.date || "",
              done: !!fr.is_complete,
              emoji: selectedEmoji,
              priority: selectedPriority
            });
            return true;
          } catch (err2) {
            if (isNetworkError(err2)) {
              console.warn("[todo] Retry insert unreachable; keeping task locally.", err2);
              todos.push(localTask);
              switchOffline(err2);
              render();
              return true;
            }
            console.error("[todo] Retry insert failed:", err2);
            throw err2;
          }
        }

        throw err;
      }
    }

    // --- Toggle done ---
    async function toggleDone(id) {
      var task = todos.find(function (t) { return t.id === id; });
      if (!task) return;

      var newDone = !task.done;

      // Optimistic update
      task.done = newDone;
      render();

      if (mode === "offline") {
        localSave(todos);
        return;
      }

      try {
        var result = await sb
          .from("todos")
          .update({ is_complete: newDone })
          .eq("id", id);

        if (result.error) throw result.error;
      } catch (err) {
        if (isNetworkError(err)) {
          // Keep the toggle and continue locally.
          switchOffline(err);
          return;
        }
        // If is_complete column doesn't exist, keep local state only (no revert)
        var msg = (err.message || "").toLowerCase();
        if (msg.indexOf("column") === -1) {
          task.done = !newDone;
          render();
        }
      }
    }

    // --- Remove task ---
    async function removeTask(id, li) {
      li.classList.add("is-removing");

      setTimeout(function () {
        todos = todos.filter(function (t) { return t.id !== id; });
        if (mode === "offline") localSave(todos);
        render();
      }, 250);

      if (mode === "offline") return;

      try {
        var result = await sb.from("todos").delete().eq("id", id);
        if (result.error) throw result.error;
      } catch (err) {
        if (isNetworkError(err)) {
          // Deletion already applied in memory — persist it and stay local.
          switchOffline(err);
        } else {
          // Reload to restore correct state
          loadTodos();
        }
      }
    }

    // --- Inline edit task ---
    function startEdit(id, span) {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "todo-edit-input";
      input.value = span.textContent;
      input.setAttribute("aria-label", "Edit task");

      span.replaceWith(input);
      input.focus();
      input.select();

      var settled = false;

      async function commit() {
        if (settled) return;
        settled = true;
        var newText = input.value.trim();
        if (!newText) {
          render();
          return;
        }

        // Optimistic update
        var task = todos.find(function (t) { return t.id === id; });
        if (task) task.text = newText;
        render();

        if (mode === "offline") {
          localSave(todos);
          return;
        }

        try {
          var result = await sb
            .from("todos")
            .update({ task: newText })
            .eq("id", id);

          if (result.error) throw result.error;
        } catch (err) {
          if (isNetworkError(err)) {
            switchOffline(err);
          } else {
            loadTodos();
          }
        }
      }

      function cancel() {
        if (settled) return;
        settled = true;
        render();
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      });

      input.addEventListener("blur", commit);
    }

    // --- Clear completed ---
    if (clearBtn) {
      clearBtn.addEventListener("click", async function () {
        var doneIds = todos.filter(function (t) { return t.done; }).map(function (t) { return t.id; });
        if (doneIds.length === 0) return;

        todos = todos.filter(function (t) { return !t.done; });
        render();

        if (mode === "offline") {
          localSave(todos);
          return;
        }

        try {
          var result = await sb.from("todos").delete().in("id", doneIds);
          if (result.error) throw result.error;
        } catch (err) {
          if (isNetworkError(err)) {
            switchOffline(err);
          } else {
            loadTodos();
          }
        }
      });
    }

    // --- Filter tabs ---
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    // --- Event listeners ---
    addBtn.addEventListener("click", addTask);
    todoInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addTask();
    });

    // --- Emoji picker ---
    emojiBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        emojiBtns.forEach(function (b) { b.classList.remove("is-selected"); });
        btn.classList.add("is-selected");
        selectedEmoji = btn.dataset.emoji;
      });
    });

    // --- Priority picker ---
    priorityBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        priorityBtns.forEach(function (b) { b.classList.remove("is-selected"); });
        btn.classList.add("is-selected");
        selectedPriority = btn.dataset.priority;
      });
    });

    // --- Load from Supabase on page open ---
    loadTodos();
  }
})();

// --- Weather app (UAPI Weather API — free, no API key) ---
// https://uapis.cn/api/v1/misc/weather?city=...&forecast=true&lang=en
// Accepts Chinese (南京) and English/pinyin (Nanjing) city names. With
// forecast=true the response includes a 7-day forecast array (we show 3).
// Extras on top of the original search: C/F unit toggle and a saved-cities
// list, both persisted in localStorage; direct fetch with a same-origin
// /weather-api proxy fallback if the cross-origin request fails.
(function () {
  var form = document.getElementById("weather-form");
  if (!form) return;

  var input = document.getElementById("weather-city");
  var btn = document.getElementById("weather-search-btn");
  var result = document.getElementById("weather-result");
  var ENDPOINT = "https://uapis.cn/api/v1/misc/weather";
  var PROXY = "/weather-api";

  // ---- Persistent UI state (localStorage) ----
  var UNIT_KEY = "yg-weather-unit-v1";
  var CITIES_KEY = "yg-weather-cities-v1";
  var unit = "C";
  try {
    unit = localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch (storageErr) { /* private mode etc. */ }
  var lastData = null;   // weather payload currently displayed
  var lastQuery = "";    // city query used for the current result
  var savedCities = loadSavedCities();

  var toggle = document.getElementById("weather-unit-toggle");
  var savedWrap = document.getElementById("weather-saved");
  var savedList = document.getElementById("weather-saved-list");

  var MSG_EMPTY = "Please enter a city name first.";
  var MSG_NOT_FOUND = "Cannot find this city, please check the spelling.";
  var MSG_NETWORK = "Network error, please check your connection and try again.";

  var ICONS = {
    "100": ["\u2600\uFE0F", "Sunny"],
    "101": ["\u26C5", "Cloudy"],
    "102": ["\uD83C\uDF24\uFE0F", "Few clouds"],
    "103": ["\uD83C\uDF24\uFE0F", "Partly cloudy"],
    "104": ["\u2601\uFE0F", "Overcast"],
    "150": ["\uD83C\uDF19", "Clear at night"],
    "151": ["\uD83C\uDF19", "Cloudy at night"],
    "152": ["\uD83C\uDF19", "Few clouds at night"],
    "153": ["\uD83C\uDF19", "Partly cloudy at night"],
    "154": ["\u2601\uFE0F", "Overcast at night"],
    "300": ["\uD83C\uDF26\uFE0F", "Shower rain"],
    "301": ["\uD83C\uDF27\uFE0F", "Heavy shower rain"],
    "302": ["\u26C8\uFE0F", "Thunderstorm"],
    "303": ["\u26C8\uFE0F", "Heavy thunderstorm"],
    "304": ["\u26C8\uFE0F", "Thunderstorm with hail"],
    "305": ["\uD83C\uDF26\uFE0F", "Light rain"],
    "306": ["\uD83C\uDF27\uFE0F", "Moderate rain"],
    "307": ["\uD83C\uDF27\uFE0F", "Heavy rain"],
    "308": ["\u26C8\uFE0F", "Extreme rain"],
    "309": ["\uD83C\uDF26\uFE0F", "Drizzle"],
    "310": ["\uD83C\uDF27\uFE0F", "Storm rain"],
    "311": ["\uD83C\uDF27\uFE0F", "Heavy storm rain"],
    "312": ["\u26C8\uFE0F", "Severe storm"],
    "313": ["\uD83C\uDF27\uFE0F", "Freezing rain"],
    "314": ["\uD83C\uDF27\uFE0F", "Light to moderate rain"],
    "315": ["\uD83C\uDF27\uFE0F", "Moderate to heavy rain"],
    "316": ["\uD83C\uDF27\uFE0F", "Heavy storm rain"],
    "317": ["\u26C8\uFE0F", "Storm to severe storm"],
    "318": ["\u26C8\uFE0F", "Severe to extreme storm"],
    "399": ["\uD83C\uDF27\uFE0F", "Rain"],
    "400": ["\uD83C\uDF28\uFE0F", "Light snow"],
    "401": ["\uD83C\uDF28\uFE0F", "Moderate snow"],
    "402": ["\u2744\uFE0F", "Heavy snow"],
    "403": ["\uD83C\uDF28\uFE0F", "Snow flurry"],
    "404": ["\uD83C\uDF28\uFE0F", "Snow shower"],
    "405": ["\uD83C\uDF28\uFE0F", "Light sleet"],
    "406": ["\uD83C\uDF28\uFE0F", "Moderate sleet"],
    "407": ["\uD83C\uDF28\uFE0F", "Heavy sleet"],
    "408": ["\uD83C\uDF28\uFE0F", "Sleet"],
    "409": ["\uD83C\uDF28\uFE0F", "Light snow shower"],
    "410": ["\uD83C\uDF28\uFE0F", "Moderate snow shower"],
    "499": ["\u2744\uFE0F", "Snow"],
    "500": ["\uD83C\uDF2B\uFE0F", "Light fog"],
    "501": ["\uD83C\uDF2B\uFE0F", "Fog"],
    "502": ["\uD83C\uDF2B\uFE0F", "Dense fog"],
    "503": ["\uD83C\uDF2B\uFE0F", "Drifting dust"],
    "504": ["\uD83D\uDE37", "Dust"],
    "507": ["\uD83C\uDF2A\uFE0F", "Sandstorm"],
    "508": ["\uD83C\uDF2A\uFE0F", "Strong sandstorm"],
    "509": ["\uD83C\uDF2B\uFE0F", "Mist"],
    "510": ["\uD83C\uDF2B\uFE0F", "Fog"],
    "511": ["\uD83C\uDF2B\uFE0F", "Dense fog"],
    "512": ["\uD83D\uDE37", "Haze"],
    "513": ["\uD83D\uDE37", "Moderate haze"],
    "514": ["\uD83D\uDE37", "Heavy haze"],
    "515": ["\uD83C\uDF2A\uFE0F", "Dust haze"],
    "900": ["\uD83D\uDD25", "Hot"],
    "901": ["\uD83E\uDD76", "Cold"],
    "999": ["\uD83C\uDF21\uFE0F", "Weather data available"]
  };

  var WIND_DIR = {
    "\u5317\u98CE": "North wind",
    "\u5357\u98CE": "South wind",
    "\u4E1C\u98CE": "East wind",
    "\u897F\u98CE": "West wind",
    "\u4E1C\u5317\u98CE": "Northeast wind",
    "\u897F\u5317\u98CE": "Northwest wind",
    "\u4E1C\u5357\u98CE": "Southeast wind",
    "\u897F\u5357\u98CE": "Southwest wind"
  };

  function describeIcon(code, rawLabel) {
    if (Object.prototype.hasOwnProperty.call(ICONS, code)) {
      return ICONS[code];
    }
    var n = parseInt(code, 10);
    if (n >= 300 && n < 400) return ["\uD83C\uDF27\uFE0F", "Rain"];
    if (n >= 400 && n < 500) return ["\u2744\uFE0F", "Snow"];
    if (n >= 500 && n < 516) return ["\uD83C\uDF2B\uFE0F", "Fog or haze"];
    return ["\uD83C\uDF21\uFE0F", rawLabel || "Weather data available"];
  }

  // With lang=en the API abbreviates wind direction ("SE" -> "Southeast wind").
  var WIND_EN = {
    "N": "North wind", "NE": "Northeast wind", "E": "East wind",
    "SE": "Southeast wind", "S": "South wind", "SW": "Southwest wind",
    "W": "West wind", "NW": "Northwest wind"
  };

  // Forecast days only carry an English condition STRING (no icon code),
  // so map the wording onto the same emoji family as the ICONS table.
  function conditionEmoji(text) {
    var t = String(text || "").toLowerCase();
    if (t.indexOf("thunder") > -1 || t.indexOf("storm") > -1) return ICONS["302"][0];
    if (t.indexOf("sleet") > -1) return ICONS["405"][0];
    if (t.indexOf("snow") > -1) return ICONS["400"][0];
    if (t.indexOf("drizzle") > -1 || t.indexOf("light rain") > -1) return ICONS["305"][0];
    if (t.indexOf("freez") > -1 || t.indexOf("rain") > -1 || t.indexOf("shower") > -1) return ICONS["306"][0];
    if (t.indexOf("fog") > -1 || t.indexOf("mist") > -1 || t.indexOf("haze") > -1) return ICONS["501"][0];
    if (t.indexOf("overcast") > -1) return ICONS["104"][0];
    if (t.indexOf("partly") > -1 || t.indexOf("few") > -1) return ICONS["103"][0];
    if (t.indexOf("cloud") > -1) return ICONS["101"][0];
    if (t.indexOf("sunny") > -1 || t.indexOf("clear") > -1 || t.indexOf("fair") > -1) return ICONS["100"][0];
    return ICONS["999"][0];
  }

  // ---- Temperature unit (Celsius <-> Fahrenheit) ----
  function toFahrenheit(c) {
    return Number(c) * 9 / 5 + 32;
  }

  function fmtTemp(c) {
    if (c === undefined || c === null || c === "" || isNaN(Number(c))) {
      return "--\u00B0";
    }
    var n = unit === "F" ? toFahrenheit(c) : Number(c);
    return Math.round(n) + "\u00B0" + unit;
  }

  // UAPI lang=en returns "SE" / "Level 4"; older zh mode returned "东南风" / "4级".
  function windLabel(dir, power) {
    var d = WIND_DIR[dir] || WIND_EN[String(dir || "").toUpperCase()] || dir || "";
    var p = String(power == null ? "" : power)
      .replace(/\u7EA7/g, "")
      .replace(/^\s*level\s+/i, "")
      .trim();
    return d + (p ? " \u00B7 " + p : "");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---- Saved cities (localStorage) ----
  // Reads the persisted list and normalises every entry so a row can always
  // render both a city name and a temperature, even if an older version of
  // the app stored a different shape (missing name / non-numeric temp).
  function loadSavedCities() {
    var arr;
    try {
      arr = JSON.parse(localStorage.getItem(CITIES_KEY) || "[]");
    } catch (e) {
      return [];
    }
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (!c || typeof c !== "object") continue;
      var q = String(c.q || c.name || c.city || c.key || "").trim();
      if (!q) continue;
      var name = String(c.name || c.city || q).trim() || q;
      var raw = c.tempC != null ? c.tempC
        : (c.temp != null ? c.temp
        : (c.temperature != null ? c.temperature : null));
      var num = raw == null ? NaN : parseFloat(String(raw).replace(/[^\d.\-]+/g, ""));
      out.push({
        key: String(c.key || q).toLowerCase(),
        q: q,
        name: name,
        tempC: isNaN(num) ? null : num
      });
    }
    return out;
  }

  function persistSavedCities() {
    try {
      localStorage.setItem(CITIES_KEY, JSON.stringify(savedCities));
    } catch (e) { /* storage unavailable */ }
  }

  function cityKey(d, q) {
    return String(d && d.adcode ? d.adcode : q).toLowerCase();
  }

  function findSavedIndex(key) {
    for (var i = 0; i < savedCities.length; i++) {
      if (savedCities[i].key === key) return i;
    }
    return -1;
  }

  function renderLoading() {
    result.innerHTML =
      '<div class="weather-panel weather-loading">' +
      '<span class="weather-spin" aria-hidden="true">\uD83C\uDF2C\uFE0F</span>' +
      "<p>Loading...</p>" +
      "</div>";
  }

  function renderError(msg) {
    result.innerHTML =
      '<div class="weather-panel weather-error">' +
      '<span class="weather-error-icon" aria-hidden="true">\u26A0\uFE0F</span>' +
      "<p>" + msg + "</p>" +
      "</div>";
  }

  // Three forecast tiles (date + condition icon + high/low). The API
  // returns up to 7; the first entry is today.
  function forecastHtml(data) {
    var days = data.forecast;
    if (!days || !days.length) return "";
    var rows = "";
    for (var i = 0; i < days.length && i < 3; i++) {
      var day = days[i];
      var weekLabel = i === 0 ? "Today" : (day.week || "");
      var md = String(day.date || "").slice(5).replace("-", "/");
      rows +=
        '<div class="weather-forecast-day">' +
        '<span class="weather-forecast-week">' + escapeHtml(weekLabel) + "</span>" +
        '<span class="weather-forecast-date">' + escapeHtml(md) + "</span>" +
        '<span class="weather-forecast-icon" aria-hidden="true">' + conditionEmoji(day.weather_day) + "</span>" +
        '<span class="weather-forecast-cond">' + escapeHtml(day.weather_day || "") + "</span>" +
        '<span class="weather-forecast-temp"><b>' + fmtTemp(day.temp_max) +
        "</b> <i>" + fmtTemp(day.temp_min) + "</i></span>" +
        "</div>";
    }
    return '<div class="weather-forecast">' +
      '<p class="weather-forecast-title">3-day forecast</p>' +
      '<div class="weather-forecast-grid">' + rows + "</div></div>";
  }

  function renderSavedList(activeKey) {
    if (!savedWrap || !savedList) return;
    savedWrap.hidden = savedCities.length === 0;
    var html = "";
    savedCities.forEach(function (c) {
      var cls = "weather-saved-item" + (c.key === activeKey ? " is-active" : "");
      var name = c.name || c.q || "";
      // fmtTemp() falls back to "--°" so the temperature slot is never blank.
      html +=
        '<li class="' + cls + '">' +
        '<button type="button" class="weather-saved-city" data-q="' + escapeHtml(c.q) + '">' +
        '<span class="weather-saved-name">' + escapeHtml(name) + "</span>" +
        '<span class="weather-saved-temp">' + fmtTemp(c.tempC) + "</span>" +
        "</button>" +
        '<button type="button" class="weather-saved-del" data-key="' + escapeHtml(c.key) +
          '" aria-label="Remove ' + escapeHtml(name) + '">\u00D7</button>' +
        "</li>";
    });
    savedList.innerHTML = html;
  }

  function renderWeather(data, query) {
    lastData = data;
    lastQuery = query || data.city || "";

    var desc = describeIcon(data.weather_icon, data.weather);
    var icon = Object.prototype.hasOwnProperty.call(ICONS, String(data.weather_icon))
      ? ICONS[String(data.weather_icon)][0]
      : conditionEmoji(data.weather);
    var condition = data.weather || desc[1];
    var chips = "";

    if (data.humidity !== undefined && data.humidity !== null && data.humidity !== "") {
      chips += '<span class="weather-chip">\uD83D\uDCA7 ' + escapeHtml(data.humidity) + "%</span>";
    }
    var wind = windLabel(data.wind_direction, data.wind_power);
    if (wind && wind !== " ") {
      chips += '<span class="weather-chip">\uD83C\uDF2C\uFE0F ' + escapeHtml(wind) + "</span>";
    }

    var key = cityKey(data, lastQuery);
    var isSaved = findSavedIndex(key) > -1;

    result.innerHTML =
      '<div class="weather-panel weather-ok">' +
      '<div class="weather-main">' +
      '<span class="weather-icon" aria-hidden="true">' + icon + "</span>" +
      '<div class="weather-temp-block">' +
      '<span class="weather-temp">' + fmtTemp(data.temperature) + "</span>" +
      '<span class="weather-condition">' + escapeHtml(condition) + "</span>" +
      "</div></div>" +
      '<h3 class="weather-city">' + escapeHtml(data.city || "") + "</h3>" +
      (chips ? '<div class="weather-meta">' + chips + "</div>" : "") +
      forecastHtml(data) +
      '<button type="button" class="weather-save-btn' + (isSaved ? " is-saved" : "") + '">' +
        (isSaved ? "\u2713 Saved" : "\uFF0B Save city") + "</button>" +
      "</div>";

    renderSavedList(key);
  }

  // JSON fetch that logs the FULL request URL and raw response (or error)
  // so CORS vs. network problems are visible in the browser console.
  // Reads as text first so a non-JSON gateway page cannot mask the failure.
  function getJson(url) {
    console.log("[weather] GET " + url);
    return fetch(url).then(function (res) {
      return res.text().then(function (text) {
        console.log("[weather] <- " + res.status + " (" + text.length + " bytes): " + text.slice(0, 300));
        var data = null;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error("[weather] Response was not JSON:", text.slice(0, 200));
          throw new Error("Invalid server response");
        }
        return { ok: res.ok, data: data };
      });
    });
  }

  // Build the UAPI request URL. encodeURIComponent() is applied to the city
  // every time, so Chinese names (南京 / 上海) and special characters are
  // always sent percent-encoded and URL-safe.
  function buildApiUrl(base, city) {
    return base + "?city=" + encodeURIComponent(city) +
      "&forecast=true&lang=en";
  }

  // Direct cross-origin request first; if the browser cannot complete it
  // (offline / DNS / CORS blip), retry through the same-origin proxy.
  // Rejects with err.cityNotFound when the API answers but knows no such
  // city; any other rejection is a network/request failure.
  function fetchWeather(city) {
    function classify(out) {
      var d = out.data || {};
      if (d.error === "UPSTREAM_UNREACHABLE") {
        throw new Error("Upstream unreachable");
      }
      if (!out.ok || d.error === "LOCATION_NOT_FOUND" ||
          d.code === "INVALID_PARAMETER" ||
          d.temperature === undefined || d.temperature === null) {
        var notFound = new Error("City not found");
        notFound.cityNotFound = true;
        throw notFound;
      }
      console.log("[weather] Current weather for", city, d);
      return d;
    }

    return getJson(buildApiUrl(ENDPOINT, city)).catch(function (directErr) {
      console.warn("[weather] Direct request failed, trying local proxy:", directErr);
      return getJson(buildApiUrl(PROXY, city)).catch(function (proxyErr) {
        console.error("[weather] Proxy request also failed:", proxyErr);
        throw directErr;
      });
    }).then(classify);
  }

  // Shared search flow used by the form AND by clicking a saved city.
  // Loading text, button state and error messages stay exactly as before.
  function performSearch(city) {
    btn.disabled = true;
    btn.textContent = "Searching…";
    renderLoading();

    fetchWeather(city)
      .then(function (d) {
        // Keep the saved row's name/temperature fresh for this city.
        var idx = findSavedIndex(cityKey(d, city));
        if (idx > -1) {
          savedCities[idx].q = city;
          savedCities[idx].name = d.city || city;
          savedCities[idx].tempC = d.temperature;
          persistSavedCities();
        }
        renderWeather(d, city);
      })
      .catch(function (err) {
        // The API answered but has no such city -> spelling message.
        // Anything else (offline, DNS, blocked request) -> network message.
        if (err && err.cityNotFound) {
          console.warn("[weather] City not found:", city);
          renderError(MSG_NOT_FOUND);
        } else {
          console.error("[weather] Weather request failed:", err);
          renderError(MSG_NETWORK);
        }
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Search";
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var city = input.value.trim();

    // Empty input: do not call the API
    if (!city) {
      renderError(MSG_EMPTY);
      input.focus();
      return;
    }

    performSearch(city);
  });

  // ---- °C / °F toggle (persisted) ----
  if (toggle) {
    var unitBtns = toggle.querySelectorAll(".weather-unit-btn");
    function paintUnit() {
      for (var i = 0; i < unitBtns.length; i++) {
        unitBtns[i].classList.toggle("is-active",
          unitBtns[i].getAttribute("data-unit") === unit);
      }
    }
    toggle.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".weather-unit-btn") : null;
      if (!b) return;
      unit = b.getAttribute("data-unit") === "F" ? "F" : "C";
      try { localStorage.setItem(UNIT_KEY, unit); } catch (storageErr) {}
      paintUnit();
      // Re-render every temperature already on screen in the new unit.
      if (lastData) {
        renderWeather(lastData, lastQuery);
      } else {
        renderSavedList(null);
      }
    });
    paintUnit();
  }

  // ---- "Save city" button inside a successful result ----
  result.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".weather-save-btn") : null;
    if (!b || !lastData) return;
    var key = cityKey(lastData, lastQuery);
    var idx = findSavedIndex(key);
    if (idx > -1) {
      savedCities.splice(idx, 1);
    } else {
      savedCities.push({
        key: key,
        q: lastQuery,
        name: lastData.city || lastQuery,
        tempC: lastData.temperature
      });
    }
    persistSavedCities();
    renderWeather(lastData, lastQuery);
  });

  // ---- Saved-cities list: click a city to load it, × to delete ----
  if (savedList) {
    savedList.addEventListener("click", function (e) {
      var del = e.target.closest ? e.target.closest(".weather-saved-del") : null;
      if (del) {
        var key = del.getAttribute("data-key");
        var idx = findSavedIndex(key);
        if (idx > -1) savedCities.splice(idx, 1);
        persistSavedCities();
        // Refresh active state on the save button if that city is shown.
        if (lastData && cityKey(lastData, lastQuery) === key) {
          renderWeather(lastData, lastQuery);
        } else {
          renderSavedList(lastData ? cityKey(lastData, lastQuery) : null);
        }
        return;
      }
      var cityBtn = e.target.closest ? e.target.closest(".weather-saved-city") : null;
      if (cityBtn) {
        var q = cityBtn.getAttribute("data-q");
        input.value = q;
        performSearch(q);
      }
    });
  }

  // Draw any persisted saved cities immediately on page load.
  renderSavedList(null);
})();

// --- Resume print button ---
document.addEventListener("DOMContentLoaded", function () {
  var printBtn = document.getElementById("resume-print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.print();
    });
  }
});
