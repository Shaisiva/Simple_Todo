const STORAGE_KEY = "simpleDailyTodoState";
const EMAIL_TO = "sivaelango.periyasam@granicus.com";

const defaultState = {
  tasks: [],
  settings: {
    theme: "system",
    accent: "#0071e3",
    showBackground: false,
    backgroundImage: ""
  }
};

let state = loadState();
let editingTaskId = null;
let selectedList = "today";

const listElements = {
  today: document.getElementById("todayList"),
  week: document.getElementById("weekList"),
  eventually: document.getElementById("eventuallyList")
};

const todayTitle = document.getElementById("todayTitle");
const openAddTodo = document.getElementById("openAddTodo");
const removeDone = document.getElementById("removeDone");
const emailSummary = document.getElementById("emailSummary");
const openSettings = document.getElementById("openSettings");
const todoDialog = document.getElementById("todoDialog");
const todoForm = document.getElementById("todoForm");
const todoDialogTitle = document.getElementById("todoDialogTitle");
const todoText = document.getElementById("todoText");
const cancelTodo = document.getElementById("cancelTodo");
const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const cancelSettings = document.getElementById("cancelSettings");
const showBackground = document.getElementById("showBackground");
const backgroundFile = document.getElementById("backgroundFile");
const toast = document.getElementById("toast");

const listLabels = {
  today: "Today",
  week: "This week",
  eventually: "Eventually"
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      settings: { ...defaultState.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatToday() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2400);
}

function getEffectiveTheme() {
  if (state.settings.theme !== "system") {
    return state.settings.theme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applySettings() {
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.body.classList.toggle("dark", getEffectiveTheme() === "dark");
  document.body.classList.toggle("with-background", state.settings.showBackground && Boolean(state.settings.backgroundImage));

  if (state.settings.backgroundImage) {
    document.body.style.setProperty("--background-image", `url("${state.settings.backgroundImage}")`);
  } else {
    document.body.style.removeProperty("--background-image");
  }

  settingsForm.elements.theme.value = state.settings.theme;
  settingsForm.elements.accent.value = state.settings.accent;
  showBackground.checked = state.settings.showBackground;
}

function openTodoDialog(list = "today", task = null) {
  selectedList = list;
  editingTaskId = task ? task.id : null;
  todoDialogTitle.textContent = task ? "Edit Todo" : "Add Todo";
  todoText.value = task ? task.text : "";
  todoForm.elements.todoList.value = task ? task.list : list;
  todoDialog.showModal();
  todoText.focus();
}

function closeTodoDialog() {
  editingTaskId = null;
  todoText.value = "";
  todoDialog.close();
}

function addTask(text, list) {
  state.tasks.unshift({
    id: createId(),
    text,
    list,
    done: false,
    createdAt: new Date().toISOString()
  });
  saveState();
  render();
}

function updateTask(id, text, list) {
  state.tasks = state.tasks.map((task) => (
    task.id === id ? { ...task, text, list, updatedAt: new Date().toISOString() } : task
  ));
  saveState();
  render();
}

function toggleTask(id, done) {
  state.tasks = state.tasks.map((task) => (
    task.id === id ? { ...task, done } : task
  ));
  saveState();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  render();
}

function removeCompletedTasks() {
  const doneCount = state.tasks.filter((task) => task.done).length;
  state.tasks = state.tasks.filter((task) => !task.done);
  saveState();
  render();
  showToast(doneCount ? `Removed ${doneCount} completed todo(s).` : "No completed todos to remove.");
}

function buildTaskCard(task) {
  const card = document.createElement("article");
  card.className = `todo-card${task.done ? " done" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.className = "todo-check";
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark ${task.text} complete`);
  checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));

  const text = document.createElement("p");
  text.className = "todo-text";
  text.textContent = task.text;
  text.title = task.text;

  const menu = document.createElement("div");
  menu.className = "todo-menu";

  const editButton = document.createElement("button");
  editButton.className = "mini-button";
  editButton.type = "button";
  editButton.title = "Edit todo";
  editButton.setAttribute("aria-label", "Edit todo");
  editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>';
  editButton.addEventListener("click", () => openTodoDialog(task.list, task));

  const deleteButton = document.createElement("button");
  deleteButton.className = "mini-button danger";
  deleteButton.type = "button";
  deleteButton.title = "Delete todo";
  deleteButton.setAttribute("aria-label", "Delete todo");
  deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 15H6L5 6"></path></svg>';
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  menu.append(editButton, deleteButton);
  card.append(checkbox, text, menu);
  return card;
}

function renderList(listName) {
  const element = listElements[listName];
  const tasks = state.tasks.filter((task) => task.list === listName);
  element.innerHTML = "";

  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = listName === "week"
      ? "Great! No more todos for this week.<br><button class=\"text-button empty-add\" type=\"button\">Add Todo</button>"
      : "No todos here yet.<br><button class=\"text-button empty-add\" type=\"button\">Add Todo</button>";
    empty.querySelector(".empty-add").addEventListener("click", () => openTodoDialog(listName));
    element.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    element.appendChild(buildTaskCard(task));
  });
}

function render() {
  todayTitle.textContent = formatToday();
  renderList("today");
  renderList("week");
  renderList("eventually");
  applySettings();
}

function buildEmailBody() {
  const lines = [`Todo Summary - ${formatToday()}`, ""];

  Object.entries(listLabels).forEach(([listName, label]) => {
    const tasks = state.tasks.filter((task) => task.list === listName);
    lines.push(`${label}:`);

    if (!tasks.length) {
      lines.push("- No todos");
    } else {
      tasks.forEach((task) => {
        lines.push(`- [${task.done ? "x" : " "}] ${task.text.replace(/\n/g, " ")}`);
      });
    }

    lines.push("");
  });

  return lines.join("\n");
}

function openEmailSummary() {
  const subject = `Todo Summary - ${formatToday()}`;
  const body = buildEmailBody();
  window.location.href = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function saveSettingsFromForm() {
  state.settings.theme = settingsForm.elements.theme.value;
  state.settings.accent = settingsForm.elements.accent.value;
  state.settings.showBackground = showBackground.checked;
  saveState();
  applySettings();
  settingsDialog.close();
}

openAddTodo.addEventListener("click", () => openTodoDialog("today"));
removeDone.addEventListener("click", removeCompletedTasks);
emailSummary.addEventListener("click", openEmailSummary);
const settingsNav = document.getElementById("settingsNav");
const settingsNavItems = settingsNav ? settingsNav.querySelectorAll(".settings-nav-item") : [];
const settingsPanels = document.querySelectorAll(".settings-panel");

function activateSettingsPanel(panelName) {
  settingsNavItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.panel === panelName);
  });
  settingsPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });
}

settingsNavItems.forEach((item) => {
  item.addEventListener("click", () => activateSettingsPanel(item.dataset.panel));
});

openSettings.addEventListener("click", () => {
  applySettings();
  activateSettingsPanel("theme");
  settingsDialog.showModal();
});

document.querySelectorAll(".column-add").forEach((button) => {
  button.addEventListener("click", () => openTodoDialog(button.dataset.list));
});

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = todoText.value.trim();
  const list = todoForm.elements.todoList.value || selectedList;

  if (!text) {
    showToast("Please enter a todo.");
    return;
  }

  if (editingTaskId) {
    updateTask(editingTaskId, text, list);
  } else {
    addTask(text, list);
  }

  closeTodoDialog();
});

cancelTodo.addEventListener("click", closeTodoDialog);

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettingsFromForm();
});

cancelSettings.addEventListener("click", () => settingsDialog.close());

backgroundFile.addEventListener("change", () => {
  const file = backgroundFile.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.settings.backgroundImage = reader.result;
    state.settings.showBackground = true;
    showBackground.checked = true;
    saveState();
    applySettings();
    showToast("Background image updated.");
  });
  reader.readAsDataURL(file);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings);

render();
