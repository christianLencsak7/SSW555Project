'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { handler } = require('../server');
let server, base;
before(async () => { server = http.createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });
async function request(route, method = 'GET', body) { const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, body: await response.json() }; }
const sample = { title: 'Sprint report', dueDate: '2026-10-29', course: 'SSW 555', description: 'Finish report', priority: 'High' };
test('GET starts empty', async () => { const r = await request('/api/assignments'); assert.equal(r.status, 200); assert.deepEqual(r.body, []); });
test('POST creates an assignment and GET lists it', async () => { const r = await request('/api/assignments', 'POST', sample); assert.equal(r.status, 201); assert.equal(r.body.title, sample.title); assert.equal(r.body.completed, false); const list = await request('/api/assignments'); assert.equal(list.body.length, 1); assert.equal(list.body[0].id, r.body.id); });
test('POST validates required fields', async () => { const r = await request('/api/assignments', 'POST', { ...sample, title: '' }); assert.equal(r.status, 400); });
test('PUT edits all assignment details without losing completion status', async () => { const all = await request('/api/assignments'); const id = all.body[0].id; const r = await request('/api/assignments/' + id, 'PUT', { ...sample, title: 'Updated sprint report', course: 'CS 555' }); assert.equal(r.status, 200); assert.equal(r.body.title, 'Updated sprint report'); assert.equal(r.body.course, 'CS 555'); });
test('PATCH completes and uncompletes assignment', async () => { const all = await request('/api/assignments'); const id = all.body[0].id; let r = await request('/api/assignments/' + id, 'PATCH', { completed: true }); assert.equal(r.body.completed, true); r = await request('/api/assignments/' + id, 'PATCH', { completed: false }); assert.equal(r.body.completed, false); });
test('PATCH rejects invalid status', async () => { const all = await request('/api/assignments'); const r = await request('/api/assignments/' + all.body[0].id, 'PATCH', { completed: 'yes' }); assert.equal(r.status, 400); });
test('DELETE removes an assignment', async () => { const all = await request('/api/assignments'); const id = all.body[0].id; const r = await request('/api/assignments/' + id, 'DELETE'); assert.equal(r.status, 200); assert.deepEqual((await request('/api/assignments')).body, []); assert.equal((await request('/api/assignments/' + id, 'DELETE')).status, 404); });
test('GET serves application HTML', async () => { const r = await fetch(base + '/'); assert.equal(r.status, 200); assert.match(await r.text(), /Assignment Tracker/); });
