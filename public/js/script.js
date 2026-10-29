'use strict';
const $ = id => document.getElementById(id);
const state = { assignments: [], editingId: null, deletingId: null, toastTimer: null, grouped: true, sortDirection: 'asc' };
const form = $('assignment-form');
const dialog = $('assignment-dialog');
const deleteDialog = $('delete-dialog');

// Live Server is a static preview. Use browser storage there; npm start uses the real API.
const staticPreview = location.protocol === 'file:' || /^(5500|5501|5502|5503)$/.test(location.port);
const storageKey = 'ssw555-sprint1-preview';
function previewApi(path = '', options = {}) {
  const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const id = path.startsWith('/') ? decodeURIComponent(path.slice(1)) : null;
  const method = options.method || 'GET';
  const data = options.body ? JSON.parse(options.body) : {};
  let result;
  if (method === 'GET') return items;
  if (method === 'POST') {
    result = { id: crypto.randomUUID(), ...data, completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    items.unshift(result);
  } else {
    const index = items.findIndex(a => a.id === id);
    if (index < 0) throw new Error('Assignment not found.');
    if (method === 'DELETE') { items.splice(index, 1); result = { deleted: true }; }
    else if (method === 'PUT' || method === 'PATCH') {
      result = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      items[index] = result;
    } else throw new Error('Unsupported action.');
  }
  localStorage.setItem(storageKey, JSON.stringify(items));
  return result;
}
async function api(path = '', options = {}) {
  if (staticPreview) return previewApi(path, options);
  let response;
  try { response = await fetch('/api/assignments' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new Error('Cannot reach the server. Make sure npm start is running.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The API is unavailable. Run npm start and open http://localhost:3000, or use VS Code Live Server on port 5500.'); }
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function formattedDate(value) { return new Date(value + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function isOverdue(a) { const today = new Date(); const local = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-'); return !a.completed && a.dueDate < local; }
function toast(message, undo) {
  const t = $('toast'); clearTimeout(state.toastTimer); t.replaceChildren(document.createTextNode(message));
  if (undo) { const b = element('button', '', 'Undo'); b.type = 'button'; b.addEventListener('click', () => { t.hidden = true; undo(); }); t.append(b); }
  t.hidden = false; state.toastTimer = setTimeout(() => { t.hidden = true; }, 5500);
}
function render() {
  const list = $('assignment-list'); list.replaceChildren();
  const items = state.assignments;
  $('total-count').textContent = items.length;
  $('todo-count').textContent = items.filter(a => !a.completed).length;
  $('done-count').textContent = items.filter(a => a.completed).length;
  $('list-count').textContent = items.length;
  $('empty-state').hidden = items.length !== 0;
  $('group-toggle').setAttribute('aria-pressed', String(state.grouped));
  $('sort-toggle').textContent = state.sortDirection === 'asc' ? 'Due date: Earliest first ↑' : 'Due date: Latest first ↓';
  $('view-summary').textContent = state.grouped ? 'Grouped by course; sorted by due date within each course.' : 'All assignments sorted by due date.';
  const courses = AssignmentView.groupAssignments(items, state.sortDirection);
  $('course-options').replaceChildren(...courses.map(group => { const option = element('option'); option.value = group.course; return option; }));
  const groups = state.grouped ? courses : [{ assignments: AssignmentView.sortAssignments(items, state.sortDirection) }];
  for (const group of groups) {
    const container = state.grouped ? element('section', 'course-group') : list;
    if (state.grouped) {
      const heading = element('h3', 'course-heading', group.course);
      heading.append(element('span', 'count-badge', group.assignments.length));
      container.append(heading); list.append(container);
    }
    for (const a of group.assignments) {
    const row = element('article', 'assignment-row' + (a.completed ? ' completed' : ''));
    const details = element('div');
    details.append(element('div', 'assignment-title', a.title), element('div', 'assignment-course', a.course));
    if (a.description) details.append(element('div', 'assignment-description', a.description));
    const due = element('div', 'date-cell' + (isOverdue(a) ? ' overdue' : ''), formattedDate(a.dueDate));
    if (isOverdue(a)) due.append(element('span', 'overdue-label', '● Overdue'));
    const priorityCell = element('div'); priorityCell.append(element('span', 'badge ' + a.priority, a.priority));
    const statusCell = element('div'); const label = element('label', 'status-label');
    const check = element('input'); check.type = 'checkbox'; check.checked = a.completed; check.setAttribute('aria-label', 'Mark ' + a.title + ' as ' + (a.completed ? 'incomplete' : 'completed'));
    check.addEventListener('change', async () => {
      check.disabled = true;
      try {
        const updated = await api('/' + encodeURIComponent(a.id), { method: 'PATCH', body: JSON.stringify({ completed: check.checked }) });
        state.assignments = state.assignments.map(x => x.id === a.id ? updated : x); render();
        toast(updated.completed ? 'Assignment marked complete.' : 'Assignment moved back to do.', () => setCompleted(a.id, !updated.completed));
      } catch (error) { check.checked = !check.checked; toast(error.message); } finally { check.disabled = false; }
    });
    label.append(check, element('span', '', a.completed ? 'Done' : 'To do')); statusCell.append(label);
    const actions = element('div', 'row-actions');
    const edit = element('button', 'icon-button', '✎'); edit.type = 'button'; edit.title = 'Edit assignment'; edit.setAttribute('aria-label', 'Edit ' + a.title); edit.addEventListener('click', () => openForm(a));
    const del = element('button', 'icon-button delete', '♲'); del.type = 'button'; del.title = 'Delete assignment'; del.setAttribute('aria-label', 'Delete ' + a.title); del.textContent = '×'; del.addEventListener('click', () => openDelete(a));
    actions.append(edit, del); row.append(details, due, priorityCell, statusCell, actions); container.append(row);
    }
  }
}
async function setCompleted(id, completed) {
  try { const updated = await api('/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ completed }) }); state.assignments = state.assignments.map(x => x.id === id ? updated : x); render(); toast('Change undone.'); }
  catch (error) { toast(error.message); }
}
function openForm(a = null) {
  state.editingId = a?.id || null; form.reset(); $('form-error').hidden = true;
  $('dialog-title').textContent = a ? 'Edit assignment' : 'New assignment';
  $('save-button').textContent = a ? 'Save changes' : 'Create assignment';
  if (a) for (const key of ['title', 'course', 'dueDate', 'priority', 'description']) form.elements[key].value = a[key];
  dialog.showModal(); $('title').focus();
}
function openDelete(a) { state.deletingId = a.id; $('delete-message').textContent = `“${a.title}” will be permanently deleted. This action cannot be undone.`; deleteDialog.showModal(); }
form.addEventListener('submit', async event => {
  event.preventDefault(); const error = $('form-error'); error.hidden = true;
  const data = Object.fromEntries(new FormData(form).entries());
  data.course = AssignmentView.courseName(data.course);
  if (!data.title.trim() || !data.course.trim() || !data.dueDate) { error.textContent = 'Please enter a title, course, and due date.'; error.hidden = false; return; }
  const save = $('save-button'); save.disabled = true;
  try {
    const editing = Boolean(state.editingId);
    const result = await api(editing ? '/' + encodeURIComponent(state.editingId) : '', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(data) });
    if (editing) state.assignments = state.assignments.map(x => x.id === result.id ? result : x);
    else state.assignments.unshift(result);
    dialog.close(); render(); toast(editing ? 'Assignment updated successfully.' : 'Assignment added successfully.');
  } catch (e) { error.textContent = e.message; error.hidden = false; }
  finally { save.disabled = false; }
});
$('confirm-delete').addEventListener('click', async () => {
  const b = $('confirm-delete'); b.disabled = true;
  try { await api('/' + encodeURIComponent(state.deletingId), { method: 'DELETE' }); state.assignments = state.assignments.filter(a => a.id !== state.deletingId); deleteDialog.close(); render(); toast('Assignment deleted.'); }
  catch (error) { deleteDialog.close(); toast(error.message); }
  finally { b.disabled = false; }
});
for (const id of ['add-top', 'add-inline', 'add-empty']) $(id).addEventListener('click', () => openForm());
for (const id of ['close-dialog', 'cancel-dialog']) $(id).addEventListener('click', () => dialog.close());
$('cancel-delete').addEventListener('click', () => deleteDialog.close());
$('group-toggle').addEventListener('click', () => { state.grouped = !state.grouped; render(); });
$('sort-toggle').addEventListener('click', () => { state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc'; render(); });
api().then(items => { state.assignments = items; render(); }).catch(error => { render(); toast(error.message); });
