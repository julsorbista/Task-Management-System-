# Morrow (client)

The React front end of the Morrow task manager. Plain JavaScript, plain CSS,
`useState` and `useEffect` only. There is no backend yet: the data lives in the
browser's memory and resets when you refresh the page.

## Run it

```
cd client
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

Demo account (already filled in on the log in screen):
`maya@morrow.app` / `morrow123`

## Folders

- `src/pages` - one file per screen
- `src/components` - pieces shared by several screens
- `src/data/mockData.js` - sample data
- `src/api/api.js` - EVERY data function. The backend developer replaces the
  body of each function with a real `fetch` call; the pages do not change.
- `src/utils/helpers.js` - small helpers (dates, labels, filtering)
- `src/index.css` - color variables for the light and dark theme, shared styles

## Field names

These are the names the front end uses. Change them in `mockData.js` and
`api.js` if the database uses different ones.

- User: `_id`, `name`, `email`, `password`, `photo`
- Page: `_id`, `name`, `type` (`private` / `shared`), `owner`,
  `members: [{ user, role }]` (role: `owner` / `editor` / `viewer`)
- Task: `_id`, `page`, `title`, `description`, `dueDate` (`YYYY-MM-DD`),
  `dueTime` (`HH:MM`), `priority` (`high` / `medium` / `low`),
  `status` (`todo` / `in-progress` / `done`), `assignee`,
  `reminder` (`none` / `at-time` / `10-min` / `1-hour` / `1-day` / `custom`),
  `reminderDate`, `reminderTime`, `completedAt`
- Notification: `_id`, `user`, `type` (`due-soon` / `overdue` / `assigned` /
  `shared`), `message`, `task`, `page`, `isRead`, `timeLabel`
