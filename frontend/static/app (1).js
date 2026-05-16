// ============================================================
// TaskFlow SPA — app.js
// ============================================================

// Keep this EMPTY for production on Render
const API = ''; 
let token = localStorage.getItem('tf_token');
let currentUser = null;
let currentPage = 'dashboard';
let currentProjectId = null;
let currentTaskId = null;
let projects = [];
let selectedColor = '#6366f1';
let taskModalProjectId = null;

// ── Helpers ──────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(API + path, { ...opts, headers });
  
  // Handle the "Unexpected token <" error by checking content type
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } else {
    // If we got HTML back, it's likely a 404 or Server Error
    const text = await res.text();
    console.error("Server returned non-JSON response:", text);
    throw new Error('Server error: Received HTML instead of JSON. Check your API routes.');
  }
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(dueDateIso) {
  if (!dueDateIso) return false;
  return new Date(dueDateIso) < new Date();
}

function priorityBadge(p) {
  return `<span class="priority-badge priority-${p}">${p}</span>`;
}

function statusBadge(s) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
  return `<span class="status-badge status-${s}">${labels[s] || s}</span>`;
}

// ── Auth ─────────────────────────────────────────────────────

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('signup-form').classList.add('hidden');
}

function showSignup() {
  document.getElementById('signup-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('tf_token', token);
    currentUser = data.user;
    enterApp();
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const err = document.getElementById('signup-error');
  
  if (!name || !email || !password) {
      err.textContent = "All fields are required";
      err.classList.remove('hidden');
      return;
  }

  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/signup', { 
        method: 'POST', 
        body: JSON.stringify({ name, email, password }) 
    });
    token = data.token;
    localStorage.setItem('tf_token', token);
    currentUser = data.user;
    enterApp();
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

function handleLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('tf_token');
  showAuthPage();
}

function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function enterApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateSidebar();
  navigate('dashboard');
  loadSidebarProjects();
}

function updateSidebar() {
  if (!currentUser) return;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-email').textContent = currentUser.email;
  const av = document.getElementById('sidebar-avatar');
  av.textContent = initials(currentUser.name);
  av.style.background = currentUser.avatar_color;
}

// ── Navigation ───────────────────────────────────────────────

function navigate(page, id) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'dashboard') {
    document.getElementById('page-dashboard').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    loadDashboard();
  } else if (page === 'tasks') {
    document.getElementById('page-tasks').classList.remove('hidden');
    document.getElementById('nav-tasks').classList.add('active');
    loadTasks();
  } else if (page === 'projects') {
    document.getElementById('page-projects').classList.remove('hidden');
    document.getElementById('nav-projects').classList.add('active');
    loadProjects();
  } else if (page === 'project-detail') {
    currentProjectId = id;
    document.getElementById('page-project-detail').classList.remove('hidden');
    loadProjectDetail(id);
  }
}

// ── Dashboard ────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const data = await apiFetch('/api/dashboard');
    const s = data.stats;
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-todo').textContent = s.todo;
    document.getElementById('stat-inprogress').textContent = s.in_progress;
    document.getElementById('stat-done').textContent = s.done;
    document.getElementById('stat-overdue').textContent = s.overdue;
    document.getElementById('stat-projects').textContent = s.projects;

    const rt = document.getElementById('dash-recent-tasks');
    if (!data.recent_tasks.length) {
      rt.innerHTML = `<div class="empty-state"><p>No tasks yet. Create your first!</p></div>`;
    } else {
      rt.innerHTML = data.recent_tasks.map(t => `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 cursor-pointer hover:bg-slate-800 transition-colors" onclick="openTaskDetail(${t.id})">
          <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${t.project_color}"></div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${t.title}</div>
            <div class="text-xs text-slate-500">${t.project_name}</div>
          </div>
          ${priorityBadge(t.priority)}
        </div>
      `).join('');
    }

    const tpu = document.getElementById('dash-tasks-per-user');
    if (!data.tasks_per_user.length) {
      tpu.innerHTML = `<div class="empty-state"><p>No assigned tasks yet</p></div>`;
    } else {
      const maxCount = Math.max(...data.tasks_per_user.map(u => u.count));
      tpu.innerHTML = data.tasks_per_user.map(u => `
        <div class="flex items-center gap-3">
          <div class="avatar" style="background:${u.avatar_color}">${initials(u.user_name)}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium">${u.user_name}</span>
              <span class="text-xs text-slate-400">${u.count} task${u.count > 1 ? 's' : ''}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all" style="width:${(u.count / maxCount) * 100}%"></div>
            </div>
          </div>
        </div>
      `).join('');
    }

    const ot = document.getElementById('dash-overdue-tasks');
    if (!data.overdue_tasks.length) {
      ot.innerHTML = `<div class="empty-state"><p>No overdue tasks! Great job 🎉</p></div>`;
    } else {
      ot.innerHTML = data.overdue_tasks.map(t => `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 cursor-pointer hover:border-red-500/20 transition-colors" onclick="openTaskDetail(${t.id})">
          <div class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${t.title}</div>
            <div class="text-xs text-red-400">Due ${formatDate(t.due_date)} • ${t.project_name}</div>
          </div>
          ${statusBadge(t.status)}
        </div>
      `).join('');
    }
  } catch (e) {
    toast('Failed to load dashboard', 'error');
  }
}

// ── Tasks ────────────────────────────────────────────────────

async function loadTasks() {
  const status = document.getElementById('filter-status')?.value || '';
  const priority = document.getElementById('filter-priority')?.value || '';
  let url = '/api/tasks?';
  if (status) url += `status=${status}&`;
  if (priority) url += `priority=${priority}&`;

  try {
    const data = await apiFetch(url);
    renderKanban(data.tasks, 'kanban-todo', 'kanban-inprogress', 'kanban-done', 'count-todo', 'count-inprogress', 'count-done');
  } catch (e) {
    toast('Failed to load tasks', 'error');
  }
}

function renderKanban(tasks, todoId, inpId, doneId, cTodo, cInp, cDone) {
  const todo = tasks.filter(t => t.status === 'todo');
  const inprogress = tasks.filter(t => t.status === 'in_progress');
  const done = tasks.filter(t => t.status === 'done');

  document.getElementById(cTodo).textContent = todo.length;
  document.getElementById(cInp).textContent = inprogress.length;
  document.getElementById(cDone).textContent = done.length;

  const renderList = (list, containerId) => {
    const el = document.getElementById(containerId);
    if (!list.length) {
      el.innerHTML = `<div class="empty-state text-sm py-6"><p>No tasks here</p></div>`;
      return;
    }
    el.innerHTML = list.map(t => `
      <div class="task-card ${isOverdue(t.due_date) && t.status !== 'done' ? 'overdue' : ''}" onclick="openTaskDetail(${t.id})">
        <div class="flex items-start justify-between mb-2">
          <span class="text-sm font-medium leading-snug flex-1 mr-2">${t.title}</span>
          ${priorityBadge(t.priority)}
        </div>
        ${t.description ? `<p class="text-xs text-slate-500 mb-3 line-clamp-2">${t.description}</p>` : ''}
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full" style="background:${t.project_color}"></div>
            <span class="text-xs text-slate-500 truncate max-w-24">${t.project_name}</span>
          </div>
          <div class="flex items-center gap-2">
            ${isOverdue(t.due_date) && t.status !== 'done' ? `<span class="overdue-badge">Overdue</span>` : t.due_date ? `<span class="text-xs text-slate-500">${formatDate(t.due_date)}</span>` : ''}
            ${t.assignee_name ? `<div class="avatar w-6 h-6 text-xs" style="background:${t.assignee_color}">${initials(t.assignee_name)}</div>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  };

  renderList(todo, todoId);
  renderList(inprogress, inpId);
  renderList(done, doneId);
}

// ── Projects ─────────────────────────────────────────────────

async function loadProjects() {
  try {
    const data = await apiFetch('/api/projects');
    projects = data.projects;
    renderProjects(projects);
    renderSidebarProjects(projects);
  } catch (e) {
    toast('Failed to load projects', 'error');
  }
}

function renderProjects(list) {
  const grid = document.getElementById('projects-grid');
  if (!list.length) {
    grid.innerHTML = `
      <div class="col-span-3 text-center py-20">
        <div class="text-6xl mb-4">📁</div>
        <h3 class="font-display text-xl font-bold mb-2">No projects yet</h3>
        <p class="text-slate-400 mb-6">Create your first project and invite your team</p>
        <button onclick="openProjectModal()" class="btn-primary mx-auto">Create Project</button>
      </div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="project-card" onclick="navigate('project-detail', ${p.id})">
      <div class="project-card-header" style="background:${p.color}"></div>
      <div class="project-card-body">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background:${p.color}20; border: 1px solid ${p.color}40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${p.color}" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span class="role-${p.role}">${p.role}</span>
        </div>
        <h3 class="font-display font-bold text-lg mb-1">${p.name}</h3>
        <p class="text-sm text-slate-400 mb-4 line-clamp-2">${p.description || 'No description'}</p>
        <div class="flex items-center gap-4 text-xs text-slate-500">
          <span class="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            ${p.member_count} member${p.member_count !== 1 ? 's' : ''}
          </span>
          <span class="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            ${p.task_count} task${p.task_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

async function loadSidebarProjects() {
  try {
    const data = await apiFetch('/api/projects');
    projects = data.projects;
    renderSidebarProjects(projects);
  } catch (e) {}
}

function renderSidebarProjects(list) {
  const container = document.getElementById('sidebar-projects');
  const existing = container.querySelectorAll('.project-nav');
  existing.forEach(e => e.remove());

  list.slice(0, 8).forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'nav-item project-nav w-full';
    btn.innerHTML = `<span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:${p.color}"></span><span class="truncate">${p.name}</span>`;
    btn.onclick = () => navigate('project-detail', p.id);
    container.appendChild(btn);
  });
}

// ── Project Detail ────────────────────────────────────────────

async function loadProjectDetail(id) {
  try {
    const data = await apiFetch(`/api/projects/${id}`);
    const p = data.project;
    document.getElementById('pd-name').textContent = p.name;
    document.getElementById('pd-desc').textContent = p.description || '';
    const dot = document.getElementById('pd-color-dot');
    dot.style.background = p.color + '20';
    dot.style.border = `1px solid ${p.color}40`;
    dot.querySelector('svg').setAttribute('stroke', p.color);

    const adminActions = document.getElementById('pd-admin-actions');
    if (p.role === 'admin') adminActions.classList.remove('hidden');
    else adminActions.classList.add('hidden');

    await loadProjectTasks(id);
  } catch (e) {
    toast('Failed to load project', 'error');
  }
}

async function loadProjectTasks(id) {
  try {
    const data = await apiFetch(`/api/projects/${id}/tasks`);
    renderKanban(data.tasks, 'pd-kanban-todo', 'pd-kanban-inprogress', 'pd-kanban-done', 'pd-count-todo', 'pd-count-inprogress', 'pd-count-done');
  } catch (e) {}
}

async function loadProjectMembers() {
  const projId = currentProjectId;
  if (!projId) return;
  try {
    const data = await apiFetch(`/api/projects/${projId}/members`);
    const container = document.getElementById('pd-members-list');
    if (container) {
      container.innerHTML = data.members.map(m => `
        <div class="member-card">
          <div class="avatar" style="background:${m.avatar_color}">${initials(m.user_name)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">${m.user_name}</div>
            <div class="text-xs text-slate-400 truncate">${m.user_email}</div>
          </div>
          <span class="role-${m.role}">${m.role}</span>
          ${m.user_id !== currentUser?.id ? `
            <button onclick="removeMember(${m.user_id})" class="text-slate-500 hover:text-red-400 transition-colors ml-2" title="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ` : ''}
        </div>
      `).join('');
    }

    const sel = document.getElementById('task-assignee');
    if (sel) {
      sel.innerHTML = '<option value="">Unassigned</option>' + data.members.map(m =>
        `<option value="${m.user_id}">${m.user_name}</option>`
      ).join('');
    }
  } catch (e) {}
}

function switchPDTab(tab) {
  document.getElementById('pd-tasks-content').classList.toggle('hidden', tab !== 'tasks');
  document.getElementById('pd-members-content').classList.toggle('hidden', tab !== 'members');
  document.getElementById('pd-tab-tasks').classList.toggle('active', tab === 'tasks');
  document.getElementById('pd-tab-members').classList.toggle('active', tab === 'members');
  if (tab === 'members') loadProjectMembers();
}

// ── Task Detail ───────────────────────────────────────────────

async function openTaskDetail(taskId) {
  currentTaskId = taskId;
  try {
    const data = await apiFetch(`/api/tasks/${taskId}`);
    const t = data.task;
    document.getElementById('td-title').textContent = t.title;
    document.getElementById('td-desc').textContent = t.description || 'No description provided.';
    document.getElementById('td-status').value = t.status;
    document.getElementById('td-priority').innerHTML = priorityBadge(t.priority);
    document.getElementById('td-due').textContent = t.due_date ? formatDate(t.due_date) : 'No due date';
    document.getElementById('td-creator').textContent = t.creator_name;
    document.getElementById('td-project').innerHTML = `<div class="w-3 h-3 rounded-sm" style="background:${t.project_color}"></div><span>${t.project_name}</span>`;
    document.getElementById('td-assignee').innerHTML = t.assignee_name
      ? `<div class="avatar" style="background:${t.assignee_color}">${initials(t.assignee_name)}</div><span>${t.assignee_name}</span>`
      : '<span class="text-slate-500">Unassigned</span>';

    const isAdmin = projects.find(p => p.id === t.project_id)?.role === 'admin';
    document.getElementById('td-delete-btn').classList.toggle('hidden', !isAdmin);

    openModal('modal-task-detail');
  } catch (e) {
    toast('Failed to load task', 'error');
  }
}

async function handleTaskStatusChange() {
  const newStatus = document.getElementById('td-status').value;
  try {
    await apiFetch(`/api/tasks/${currentTaskId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    toast('Status updated', 'success');
    refreshCurrentPage();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function handleDeleteTask() {
  if (!confirm('Delete this task?')) return;
  try {
    await apiFetch(`/api/tasks/${currentTaskId}`, { method: 'DELETE' });
    closeModal();
    toast('Task deleted', 'success');
    refreshCurrentPage();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function refreshCurrentPage() {
  if (currentPage === 'tasks') loadTasks();
  else if (currentPage === 'dashboard') loadDashboard();
  else if (currentPage === 'project-detail') loadProjectTasks(currentProjectId);
}

// ── Create Project ────────────────────────────────────────────

function openProjectModal() {
  selectedColor = '#6366f1';
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === selectedColor);
  });
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  openModal('modal-project');
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

async function handleCreateProject() {
  const name = document.getElementById('proj-name').value.trim();
  const description = document.getElementById('proj-desc').value.trim();
  if (!name) { toast('Project name is required', 'error'); return; }
  try {
    const data = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ name, description, color: selectedColor }) });
    closeModal();
    toast('Project created!', 'success');
    projects.push(data.project);
    renderProjects(projects);
    renderSidebarProjects(projects);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Create Task ───────────────────────────────────────────────

async function openTaskModal(preProjectId) {
  taskModalProjectId = preProjectId || currentProjectId || null;
  try {
    const data = await apiFetch('/api/projects');
    const projs = data.projects;
    const sel = document.getElementById('task-project');
    sel.innerHTML = projs.map(p => `<option value="${p.id}" ${p.id === taskModalProjectId ? 'selected' : ''}>${p.name}</option>`).join('');

    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-due').value = '';
    document.getElementById('task-assignee').innerHTML = '<option value="">Unassigned</option>';

    if (projs.length) {
      const firstId = taskModalProjectId || projs[0].id;
      sel.value = firstId;
      await loadMembersForSelect(firstId);
    }
    openModal('modal-task');
  } catch (e) {
    toast('Failed to load projects', 'error');
  }
}

async function handleTaskProjectChange() {
  const id = document.getElementById('task-project')?.value;
  if (id) await loadMembersForSelect(parseInt(id));
}

async function loadMembersForSelect(projectId) {
  try {
    const data = await apiFetch(`/api/projects/${projectId}/members`);
    const sel = document.getElementById('task-assignee');
    if (sel) {
      sel.innerHTML = '<option value="">Unassigned</option>' + data.members.map(m =>
        `<option value="${m.user_id}">${m.user_name}</option>`
      ).join('');
    }
  } catch (e) {}
}

async function handleCreateTask() {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const project_id = parseInt(document.getElementById('task-project').value);
  const priority = document.getElementById('task-priority').value;
  const due_date = document.getElementById('task-due').value;
  const assignee_id = document.getElementById('task-assignee').value || null;

  if (!title) { toast('Task title is required', 'error'); return; }
  if (!project_id) { toast('Please select a project', 'error'); return; }

  try {
    await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title, description, project_id, priority, due_date, assignee_id: assignee_id ? parseInt(assignee_id) : null }) });
    closeModal();
    toast('Task created!', 'success');
    refreshCurrentPage();
    loadSidebarProjects();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Add Member ────────────────────────────────────────────────

function openAddMemberModal() {
  document.getElementById('member-email').value = '';
  document.getElementById('member-role').value = 'member';
  openModal('modal-add-member');
}

async function handleAddMember() {
  const email = document.getElementById('member-email').value.trim();
  const role = document.getElementById('member-role').value;
  if (!email) { toast('Email is required', 'error'); return; }
  try {
    await apiFetch(`/api/projects/${currentProjectId}/members`, { method: 'POST', body: JSON.stringify({ email, role }) });
    closeModal();
    toast('Member added!', 'success');
    loadProjectMembers();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeMember(userId) {
  if (!confirm('Remove this member from the project?')) return;
  try {
    await apiFetch(`/api/projects/${currentProjectId}/members/${userId}`, { method: 'DELETE' });
    toast('Member removed', 'success');
    loadProjectMembers();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Modal Helpers ─────────────────────────────────────────────

function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Init ──────────────────────────────────────────────────────

async function init() {
  if (token) {
    try {
      const data = await apiFetch('/api/auth/me');
      currentUser = data.user;
      enterApp();
    } catch (e) {
      token = null;
      localStorage.removeItem('tf_token');
      showAuthPage();
    }
  } else {
    showAuthPage();
  }
}

init();
