/* ============================================================
   Life Dashboard — app.js
   Vanilla JS | localStorage | No frameworks
   ============================================================ */

// ── Utility ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ── Theme ─────────────────────────────────────────────────────
const themeToggle = $('themeToggle');
let isDark = loadFromStorage('dashboard_theme', false);

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}

applyTheme();

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  saveToStorage('dashboard_theme', isDark);
  applyTheme();
});

// ── Clock & Greeting ──────────────────────────────────────────
const clockEl = $('clock');
const dateEl = $('dateDisplay');
const greetingEl = $('greeting');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  let greet;
  if (h >= 5 && h < 12) greet = '☀️ Good Morning';
  else if (h >= 12 && h < 17) greet = '🌤️ Good Afternoon';
  else if (h >= 17 && h < 21) greet = '🌆 Good Evening';
  else greet = '🌙 Good Night';

  greetingEl.textContent = greet;
}

updateClock();
setInterval(updateClock, 1000);

// ── Focus Timer ───────────────────────────────────────────────
const timerDisplay = $('timerDisplay');
const startBtn = $('startBtn');
const stopBtn = $('stopBtn');
const resetBtn = $('resetBtn');
const pomoDurationInput = $('pomoDuration');
const applyDurationBtn = $('applyDuration');
const timerSound = $('timerSound');

let pomoDuration = loadFromStorage('dashboard_pomo_duration', 25); // minutes
let timerSeconds = pomoDuration * 60;
let timerInterval = null;
let timerRunning = false;

pomoDurationInput.value = pomoDuration;

function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTimer(timerSeconds);
}

renderTimer();

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplay.textContent = '00:00';
      // Simple browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete! 🎉');
        timerSound.currentTime = 0; 
        timerSound.play();
      } else {
        timerSound.currentTime = 0; 
        timerSound.play();
      }
      return;
    }
    timerSeconds--;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function resetTimer() {
  stopTimer();
  timerSeconds = pomoDuration * 60;
  renderTimer();
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);

applyDurationBtn.addEventListener('click', () => {
  const val = parseInt(pomoDurationInput.value, 10);
  if (isNaN(val) || val < 1 || val > 120) {
    pomoDurationInput.style.borderColor = '#e05555';
    setTimeout(() => (pomoDurationInput.style.borderColor = ''), 1000);
    return;
  }
  pomoDuration = val;
  saveToStorage('dashboard_pomo_duration', pomoDuration);
  resetTimer();
});

// Request notification permission on first interaction
document.addEventListener('click', () => {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, { once: true });

// ── To-Do List ────────────────────────────────────────────────
const taskForm = $('taskForm');
const taskInput = $('taskInput');
const taskList = $('taskList');
const editDialog = $('editDialog');
const editTaskInput = $('editTaskInput');
const saveEditBtn = $('saveEditBtn');
const cancelEditBtn = $('cancelEditBtn');

let tasks = loadFromStorage('dashboard_tasks', []);
let editingTaskId = null;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Drag-and-drop state ──
let dragSrcId = null;

function renderTasks() {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = '<li style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">No tasks yet. Add one above!</li>';
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;
    li.draggable = true;

    // ── Drag handle ──
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';
    handle.setAttribute('aria-hidden', 'true');

    // ── Checkbox ──
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', `Mark "${task.text}" as done`);
    checkbox.addEventListener('change', () => toggleTask(task.id));

    // ── Text ──
    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    // ── Action buttons ──
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit task "${task.text}"`);
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete task "${task.text}"`);
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(handle);
    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);

    // ── Drag events ──
    li.addEventListener('dragstart', (e) => {
      dragSrcId = task.id;
      // Only allow drag when initiated from the handle or the item itself
      e.dataTransfer.effectAllowed = 'move';
      // Slight delay so the browser snapshot doesn't show the dimmed state
      requestAnimationFrame(() => li.classList.add('dragging'));
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      taskList.querySelectorAll('.task-item').forEach((el) => el.classList.remove('drag-over'));
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (task.id !== dragSrcId) {
        taskList.querySelectorAll('.task-item').forEach((el) => el.classList.remove('drag-over'));
        li.classList.add('drag-over');
      }
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      if (!dragSrcId || dragSrcId === task.id) return;

      const fromIndex = tasks.findIndex((t) => t.id === dragSrcId);
      const toIndex = tasks.findIndex((t) => t.id === task.id);
      if (fromIndex === -1 || toIndex === -1) return;

      // Reorder in-place
      const [moved] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, moved);

      saveToStorage('dashboard_tasks', tasks);
      renderTasks();
    });

    taskList.appendChild(li);
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }
  tasks.push({ id: generateId(), text, done: false });
  saveToStorage('dashboard_tasks', tasks);
  taskInput.value = '';
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
  saveToStorage('dashboard_tasks', tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveToStorage('dashboard_tasks', tasks);
  renderTasks();
}

function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  editingTaskId = id;
  editTaskInput.value = task.text;
  editDialog.showModal();
  editTaskInput.focus();
}

function closeEditModal() {
  editDialog.close();
  editingTaskId = null;
  editTaskInput.value = '';
}

function saveEdit() {
  const text = editTaskInput.value.trim();
  if (!text || !editingTaskId) return;
  tasks = tasks.map((t) => t.id === editingTaskId ? { ...t, text } : t);
  saveToStorage('dashboard_tasks', tasks);
  closeEditModal();
  renderTasks();
}

taskForm.addEventListener('submit', (e) => { e.preventDefault(); addTask(); });
saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', closeEditModal);
editTaskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveEdit(); });
// Close on backdrop click
editDialog.addEventListener('click', (e) => { if (e.target === editDialog) closeEditModal(); });

renderTasks();

// ── Quick Links ───────────────────────────────────────────────
const linkForm = $('linkForm');
const linkNameInput = $('linkName');
const linkUrlInput = $('linkUrl');
const linksList = $('linksList');

let links = loadFromStorage('dashboard_links', [
  { id: generateId(), name: 'Google', url: 'https://google.com' },
  { id: generateId(), name: 'Gmail', url: 'https://mail.google.com' },
  { id: generateId(), name: 'Calendar', url: 'https://calendar.google.com' },
]);

function renderLinks() {
  linksList.innerHTML = '';

  if (links.length === 0) {
    linksList.innerHTML = '<span style="color:var(--text-muted);font-size:0.9rem;">No links yet. Add one above!</span>';
    return;
  }

  links.forEach((link) => {
    const wrapper = document.createElement('span');
    wrapper.className = 'link-btn-wrapper';

    const a = document.createElement('a');
    a.className = 'link-btn';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.name;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'link-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove link "${link.name}"`);
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeLink(link.id);
    });

    wrapper.appendChild(a);
    wrapper.appendChild(removeBtn);
    linksList.appendChild(wrapper);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  let url = linkUrlInput.value.trim();

  if (!name || !url) {
    if (!name) linkNameInput.focus();
    else linkUrlInput.focus();
    return;
  }

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  links.push({ id: generateId(), name, url });
  saveToStorage('dashboard_links', links);
  linkNameInput.value = '';
  linkUrlInput.value = '';
  renderLinks();
}

function removeLink(id) {
  links = links.filter((l) => l.id !== id);
  saveToStorage('dashboard_links', links);
  renderLinks();
}

linkForm.addEventListener('submit', (e) => { e.preventDefault(); addLink(); });
linkNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); linkUrlInput.focus(); } });

renderLinks();
