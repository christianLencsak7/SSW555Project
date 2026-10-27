# Assignment Tracker | SSW 555 Sprint 1

A responsive assignment management web application built with **plain HTML, CSS, and JavaScript** and a **Node.js server using only built-in modules**. No `npm install` or third-party dependencies required.

## Run in VS Code

1. Install Node.js 18+ from the official Node.js website if needed.
2. Unzip this folder and open `SSW555Project` in VS Code.
3. Open **Terminal > New Terminal**.
4. Run `npm start` (or `node server.js`).
5. Visit **http://localhost:3000** in your browser.
6. Press `Ctrl+C` in the terminal to stop the server.

**Important:** Do not launch `index.html` directly with a `file://` URL or use Live Server on its own. This app uses backend API routes, so you must start the included Node.js server. You do not need Live Server.

## Run automated tests

Run `npm test` in the VS Code terminal. The test suite checks creation, listing, editing, completion/undo, deletion, validation, and page serving.

## Sprint 1 scope (18 story points)

| User story | Story points | Implemented functionality |
| --- | ---: | --- |
| US1: Add assignments | 5 | Create form with title, due date, course, description, and priority; POST API |
| US2: View assignments | 3 | GET API; responsive dashboard with assignment list |
| US3: Complete assignments | 3 | Completion checkbox; PATCH API; Undo toast |
| US4: Delete assignments | 2 | Delete action; confirmation dialog; DELETE API |
| US5: Edit assignments | 5 | Prefilled edit form; PUT API |

### API routes

- `GET /api/assignments` returns all assignments.
- `POST /api/assignments` creates an assignment.
- `PUT /api/assignments/:id` updates assignment details.
- `PATCH /api/assignments/:id` updates `{ "completed": true | false }`.
- `DELETE /api/assignments/:id` deletes an assignment.

An assignment includes `id`, `title`, `dueDate`, `course`, `description`, `priority`, `completed`, `createdAt`, and `updatedAt`. The server validates incoming data.

## Important: Sprint 2 persistence is NOT implemented yet

Your team's first report schedules **saving assignments between sessions** for Sprint 2 (User Story 8). Accordingly, Sprint 1 stores assignments **in server memory**: reloading the browser preserves data while the server runs, but **stopping/restarting the server clears all assignments**. This is intentional and keeps Sprint 1 aligned with the sprint backlog.

The report also schedules organizing by course and sorting by due date for Sprint 2. These features are not included yet. Priority is recorded/displayed, but priority-based filtering and reminders are outside Sprint 1.

## Manual test checklist

- [ ] Create an assignment with all fields and see it in the list.
- [ ] Try submitting with a missing title, course, or due date.
- [ ] Edit the title, due date, course, description, and priority.
- [ ] Check an assignment complete; verify counts update.
- [ ] Click **Undo** after completing; verify it becomes incomplete again.
- [ ] Click Delete, then **Keep assignment**; verify it stays.
- [ ] Delete again and confirm; verify it disappears.
- [ ] Add an assignment with a past due date; verify it shows **Overdue**.
- [ ] Refresh the browser while the server runs; verify assignments remain.

## Push to the team GitHub repository after testing

Clone the team's repository, copy these files into its folder (preserving the `.git` directory), then from that folder run:

```bash
git add .
git commit -m "Implement Sprint 1 assignment tracker"
git push origin main
```

You must have repository write access. Coordinate with your teammates before pushing to the shared `main` branch.


## VS Code Live Server preview

You can also right-click `public/index.html` and select **Open with Live Server**.
The CSS and JavaScript now load using relative paths. On Live Server's usual ports
(5500-5503), the app uses browser `localStorage` for a fully interactive preview,
so the buttons work without Node.js. Preview data stays in that browser only.

**For the actual Sprint 1 backend/API implementation and API tests**, run
`npm start` and open `http://localhost:3000`. That mode uses the Node server
and its in-memory assignment store (cleared on server restart).
