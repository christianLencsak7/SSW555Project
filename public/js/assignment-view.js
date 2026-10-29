'use strict';

// Shared with Node tests; runs directly in the browser without a build step.
(function (root) {
  const courseName = value => value.trim().replace(/\s+/g, ' ');
  function sortAssignments(items, direction = 'asc') {
    return [...items].sort((a, b) => {
      const dateOrder = a.dueDate.localeCompare(b.dueDate);
      return (direction === 'desc' ? -dateOrder : dateOrder) ||
        a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
  }
  function groupAssignments(items, direction = 'asc') {
    const groups = new Map();
    for (const assignment of items) {
      const name = courseName(assignment.course);
      const key = name.toLowerCase();
      if (!groups.has(key)) groups.set(key, { course: name, assignments: [] });
      groups.get(key).assignments.push(assignment);
    }
    return [...groups.values()].sort((a, b) => a.course.localeCompare(b.course))
      .map(group => ({ ...group, assignments: sortAssignments(group.assignments, direction) }));
  }
  const view = { courseName, sortAssignments, groupAssignments };
  if (typeof module !== 'undefined' && module.exports) module.exports = view;
  else root.AssignmentView = view;
})(globalThis);
