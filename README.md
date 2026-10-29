# Assignment Tracker | SSW 555 Sprint 2

A responsive assignment tracker built with HTML, CSS, JavaScript, and Node.js built-in modules. No npm install or third-party dependencies are required.

## Run

1. Open this repository folder in VS Code with Node.js 18 or newer installed.
2. Run `npm start` (or `node server.js`).
3. Open http://localhost:3000.
4. Stop the server with Ctrl+C. Assignments will still be available the next time you start it.

## Sprint 2 scope (11 story points)

| Sprint backlog story | Points | Implemented behavior |
| --- | ---: | --- |
| US6: Organize by Course | 5 | Course tags, existing-course suggestions, and alphabetically ordered course groups with assignment counts. Toggle grouping off for one combined list. |
| US7: Sort by Due Date | 3 | Earliest/latest toggle sorts within each course, or across the combined list when grouping is off. Earliest first is the default. |
| US8: Save Assignments | 3 | Saves every successful creation, edit, completion/undo, and deletion to a local JSON file and reloads it on server startup. |

The first report calls persistence **US8 in the Sprint 2 backlog** and **US12 in the product backlog**. This table follows the sprint backlog. Product-backlog US8 (filtering by course/status) is a separate feature and is not included in this sprint.

Course names ignore case and repeated spaces when grouping. The course field suggests existing courses, while still allowing new ones. Editing a course moves the assignment into its new group; deleting the last assignment removes that group. The sorting toggle works in both views. Equal due dates use title, then ID, to keep ordering consistent. View choices reset to grouped/earliest on page reload.

## Saved data

The Node server automatically creates `data/assignments.json` on the first successful change. This file stays on the computer running the server and is excluded from Git. Refreshing or closing the browser, or stopping and restarting the server, preserves assignments. All browsers connecting to this server share its assignments.

Writes use a temporary file followed by replacement of the saved snapshot. A failed save returns an error and keeps the previous in-memory state. Invalid or unreadable saved data stops startup instead of silently resetting it. If this occurs, back up the file and correct or restore it before restarting.

For a different storage location, set `DATA_FILE` to an absolute file path before starting the server. Set `PORT` to change the default port. Run only one server process per data file; this is a local, single-server store, not a multi-user database with accounts or concurrent server coordination. Back up the data file separately if needed.

## Sprint 1 functionality retained

Create, view, edit, complete/undo, and delete assignments, with confirmation before deletion. Fields include title, due date, course, description, and High/Medium/Low priority. Incomplete assignments with past due dates are marked overdue. Dashboard counts show total, to-do, and completed assignments.

### API routes

- `GET /api/assignments`: list assignments.
- `POST /api/assignments`: create an assignment.
- `PUT /api/assignments/:id`: edit assignment details.
- `PATCH /api/assignments/:id`: update `{ "completed": true | false }`.
- `DELETE /api/assignments/:id`: delete an assignment.

Assignments include `id`, `title`, `dueDate`, `course`, `description`, `priority`, `completed`, `createdAt`, and `updatedAt`. The server validates incoming data.

## Tests

Run `npm test`. Tests use temporary storage and do not touch your saved assignments. The suite covers the existing API, date sorting in both directions, course grouping, independent server-process restarts after every type of change, corrupt storage, and failed writes that preserve the previous state.

### Manual acceptance checklist

- [ ] Create two assignments in one course and one in another; verify course headings and counts.
- [ ] Enter a course using different capitalization/spacing; verify it stays in the same group.
- [ ] Toggle earliest/latest and verify dates reverse within each group.
- [ ] Turn grouping off and verify dates sort across the entire list.
- [ ] Edit a due date/course; verify the assignment is sorted and grouped correctly.
- [ ] Mark complete and Undo; verify counts and status update.
- [ ] Cancel a deletion; verify the assignment stays. Confirm a deletion; verify it disappears.
- [ ] Refresh, close/reopen the browser, and restart Node; verify saved fields and status remain.
- [ ] Restart after deletion; verify the deleted assignment does not return.
- [ ] Check the dashboard on a narrow screen.

## VS Code Live Server preview

Right-click `public/index.html` and select **Open with Live Server**. On ports 5500–5503, the preview saves to this browser's localStorage under the existing `ssw555-sprint1-preview` key, preserving earlier preview data. Preview data is separate from the Node server's data and is not transferred between modes. Use `npm start` for the backend and persistence tests.
