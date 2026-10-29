'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sortAssignments, groupAssignments } = require('../public/js/assignment-view');
const items = [
  { id: '1', title: 'Later', course: 'SSW 555', dueDate: '2027-01-01' },
  { id: '2', title: 'Earlier', course: ' ssw   555 ', dueDate: '2026-12-31' },
  { id: '3', title: 'Other class', course: 'CS 546', dueDate: '2026-11-01' }
];
test('sorts dates across months and years in either direction without changing source order', () => {
  assert.deepEqual(sortAssignments(items).map(a => a.id), ['3', '2', '1']);
  assert.deepEqual(sortAssignments(items, 'desc').map(a => a.id), ['1', '2', '3']);
  assert.deepEqual(items.map(a => a.id), ['1', '2', '3']);
});
test('groups course spelling variants together and sorts each course independently', () => {
  const groups = groupAssignments(items);
  assert.deepEqual(groups.map(g => g.course), ['CS 546', 'SSW 555']);
  assert.deepEqual(groups[1].assignments.map(a => a.id), ['2', '1']);
  assert.deepEqual(groupAssignments(items, 'desc')[1].assignments.map(a => a.id), ['1', '2']);
});
test('regroups a changed course and removes empty courses after deletion', () => {
  const moved = items.map(a => ({ ...a, course: 'CS 546' }));
  assert.equal(groupAssignments(moved).length, 1);
  assert.deepEqual(groupAssignments([]), []);
  assert.deepEqual(sortAssignments([]), []);
});
test('equal due dates use a stable title/id order', () => {
  const same = items.map(a => ({ ...a, dueDate: '2026-11-01' }));
  assert.deepEqual(sortAssignments(same).map(a => a.id), ['2', '1', '3']);
  assert.deepEqual(sortAssignments(same, 'desc').map(a => a.id), ['2', '1', '3']);
});
