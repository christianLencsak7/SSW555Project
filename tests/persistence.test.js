'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createHandler } = require('../server');
const sample = { title: 'Persistent report', course: 'SSW 555', dueDate: '2026-11-05', description: 'Keep this', priority: 'High' };
async function start(dataFile) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: '0', DATA_FILE: dataFile }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Server start timed out: ' + output)); }, 10000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error('Server exited: ' + code + ' ' + output)); });
    child.stderr.on('data', chunk => { output += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timeout); resolve('http://127.0.0.1:' + match[1]); }
    });
  });
  return { base, stop: () => new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) return resolve(); child.once('exit', resolve); child.kill(); }) };
}
async function request(base, suffix = '', method = 'GET', body) {
  const response = await fetch(base + '/api/assignments' + suffix, {
    method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
test('create, edit, complete, undo, and delete survive separate server processes', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ssw555-restart-'));
  const dataFile = path.join(folder, 'data', 'assignments.json');
  let running;
  t.after(async () => { if (running) await running.stop(); fs.rmSync(folder, { recursive: true, force: true }); });
  async function restart() { if (running) await running.stop(); running = await start(dataFile); }
  await restart();
  const created = await request(running.base, '', 'POST', sample);
  assert.equal(created.status, 201);
  const id = '/' + created.body.id;
  await restart();
  assert.deepEqual((await request(running.base)).body, [created.body]);
  const edited = await request(running.base, id, 'PUT', { ...sample, title: 'Edited', course: 'CS 546', dueDate: '2026-11-06' });
  assert.equal(edited.status, 200);
  const completed = await request(running.base, id, 'PATCH', { completed: true });
  await restart();
  assert.deepEqual((await request(running.base)).body, [completed.body]);
  const undone = await request(running.base, id, 'PATCH', { completed: false });
  await restart();
  assert.deepEqual((await request(running.base)).body, [undone.body]);
  assert.equal((await request(running.base, id, 'DELETE')).status, 200);
  await restart();
  assert.deepEqual((await request(running.base)).body, []);
});
test('invalid saved data is rejected without overwriting the original file', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ssw555-invalid-'));
  const dataFile = path.join(folder, 'assignments.json');
  try {
    for (const content of ['broken JSON', '{}', '[{"id":"bad"}]']) {
      fs.writeFileSync(dataFile, content);
      assert.throws(() => createHandler({ dataFile }), /Cannot load assignments/);
      assert.equal(fs.readFileSync(dataFile, 'utf8'), content);
    }
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
test('failed saves return an error and leave memory and the previous file unchanged', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ssw555-failure-'));
  const dataFile = path.join(folder, 'assignments.json');
  const server = http.createServer(createHandler({ dataFile }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(folder, { recursive: true, force: true }); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const created = (await request(base, '', 'POST', sample)).body;
  const original = fs.readFileSync(dataFile, 'utf8');
  // A directory at the destination forces rename to fail on all platforms.
  fs.renameSync(dataFile, dataFile + '.backup'); fs.mkdirSync(dataFile);
  for (const [suffix, method, body] of [
    ['', 'POST', sample], ['/' + created.id, 'PUT', { ...sample, title: 'Unsaved' }],
    ['/' + created.id, 'PATCH', { completed: true }], ['/' + created.id, 'DELETE', undefined]
  ]) {
    const result = await request(base, suffix, method, body);
    assert.equal(result.status, 500);
    assert.match(result.body.error, /Could not save/);
    assert.deepEqual((await request(base)).body, [created]);
  }
  assert.equal(fs.readFileSync(dataFile + '.backup', 'utf8'), original);
  assert.equal(fs.readdirSync(folder).some(name => name.endsWith('.tmp')), false);
});
