'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function validate(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const course = typeof body.course === 'string' ? body.course.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const dueDate = body.dueDate;
  const priority = body.priority || 'Medium';
  if (!title || title.length > 120) return { error: 'Title is required (maximum 120 characters).' };
  if (!course || course.length > 80) return { error: 'Course is required (maximum 80 characters).' };
  if (description.length > 1000) return { error: 'Description must be 1,000 characters or fewer.' };
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate)) || new Date(dueDate + 'T00:00:00Z').toISOString().slice(0, 10) !== dueDate) return { error: 'Enter a valid due date.' };
  if (!['High', 'Medium', 'Low'].includes(priority)) return { error: 'Invalid priority.' };
  return { value: { title, course, description, dueDate, priority } };
}
async function readJSON(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { const obj = JSON.parse(raw); if (!obj || Array.isArray(obj) || typeof obj !== 'object') throw new Error(); return obj; }
  catch { throw Object.assign(new Error('Invalid JSON object.'), { status: 400 }); }
}
function createHandler({ dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'assignments.json') } = {}) {
  let assignments = new Map();
  try {
    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('Expected an array of assignments.');
    for (const item of saved) {
      if (!item || typeof item !== 'object' || validate(item).error ||
          typeof item.id !== 'string' || !item.id || assignments.has(item.id) ||
          typeof item.completed !== 'boolean' || typeof item.createdAt !== 'string' ||
          typeof item.updatedAt !== 'string') throw new Error('Invalid saved assignment.');
      assignments.set(item.id, item);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Cannot load assignments from ${dataFile}: ${error.message}`);
  }
  // Commit the complete snapshot before changing memory or reporting success.
  // Synchronous writes serialize mutations in this single-server application.
  function commit(next) {
    const temporary = dataFile + '.' + randomUUID() + '.tmp';
    let fd;
    try {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fd = fs.openSync(temporary, 'wx');
      fs.writeFileSync(fd, JSON.stringify([...next.values()], null, 2) + '\n');
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = undefined;
      fs.renameSync(temporary, dataFile);
      assignments = next;
    } catch (error) {
      if (fd !== undefined) fs.closeSync(fd);
      try { fs.unlinkSync(temporary); } catch { /* No temporary file to remove. */ }
      console.error('Could not save assignments:', error.message);
      throw Object.assign(new Error('Could not save assignments. Please try again.'), { status: 500 });
    }
  }
  function save(assignment) { const next = new Map(assignments); next.set(assignment.id, assignment); commit(next); }
  return async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'api') {
      if (parts[1] !== 'assignments' || parts.length > 3) return send(res, 404, { error: 'API route not found.' });
      if (parts.length === 2 && req.method === 'GET') return send(res, 200, [...assignments.values()]);
      if (parts.length === 2 && req.method === 'POST') {
        const result = validate(await readJSON(req));
        if (result.error) return send(res, 400, result);
        const now = new Date().toISOString();
        const assignment = { id: randomUUID(), ...result.value, completed: false, createdAt: now, updatedAt: now };
        save(assignment);
        return send(res, 201, assignment);
      }
      if (parts.length === 3) {
        const existing = assignments.get(parts[2]);
        if (!existing) return send(res, 404, { error: 'Assignment not found.' });
        if (req.method === 'DELETE') { const next = new Map(assignments); next.delete(parts[2]); commit(next); return send(res, 200, { deleted: true }); }
        if (req.method === 'PUT') {
          const result = validate(await readJSON(req));
          if (result.error) return send(res, 400, result);
          const updated = { ...existing, ...result.value, updatedAt: new Date().toISOString() };
          save(updated);
          return send(res, 200, updated);
        }
        if (req.method === 'PATCH') {
          const body = await readJSON(req);
          if (typeof body.completed !== 'boolean' || Object.keys(body).some(k => k !== 'completed')) return send(res, 400, { error: 'PATCH requires a boolean completed field.' });
          const updated = { ...existing, completed: body.completed, updatedAt: new Date().toISOString() };
          save(updated);
          return send(res, 200, updated);
        }
      }
      return send(res, 405, { error: 'Method not allowed.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.resolve(PUBLIC, '.' + pathname);
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Forbidden.' });
    const data = await fs.promises.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return send(res, 404, { error: 'File not found.' });
    if (error.status) return send(res, error.status, { error: error.message });
    console.error(error);
    return send(res, 500, { error: 'Unexpected server error.' });
  }
  };
}
if (require.main === module) {
  const server = http.createServer(createHandler());
  server.listen(PORT, () => console.log(`Assignment Tracker running at http://localhost:${server.address().port}`));
}
module.exports = { createHandler, validate };
