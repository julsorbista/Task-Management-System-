# Morrow – Backend Handoff

This document is for building the **Express + MongoDB** backend for the Morrow task manager.
Everything here comes from what the front end in `client/` **actually does today**.

**How the front end talks to data today:**
every data call goes through one file, `client/src/api/api.js`. Right now those functions
change arrays in the browser's memory (copied from `client/src/data/mockData.js`).
Your job is to build an API that matches these functions. Then each function body in
`api.js` gets replaced with a `fetch` call, and **no page or component has to change**,
as long as the API returns the same shapes described below.

> Quick rules that apply everywhere
> - Every ID is called **`_id`** (with the underscore). The front end never reads `id`.
> - IDs must arrive as **plain strings**. The front end compares them with `===`.
> - Linked fields (`page`, `assignee`, `owner`, `members[].user`, …) must be **just the ID string**, not a full object.
> - "Empty" values are **empty strings `''`**, not `null` (see [section 10](#10-open-questions)).
> - Dates are **text**: `'YYYY-MM-DD'`. Times are **text**: `'HH:MM'` (24-hour). Not `Date` objects.

---

## Contents

1. [Collections](#1-collections)
2. [Fields](#2-fields)
3. [IDs and links](#3-ids-and-links)
4. [Sample documents](#4-sample-documents)
5. [API endpoints](#5-api-endpoints)
6. [Where each endpoint is used](#6-where-each-endpoint-is-used)
7. [Auth](#7-auth)
8. [Validation and errors](#8-validation-and-errors)
9. [What the backend must calculate or do](#9-what-the-backend-must-calculate-or-do)
10. [Open questions](#10-open-questions)

---

## 1. Collections

**Database name:** the front end never names a database. **Suggestion: `morrow`** (the app's
name; it already appears in browser keys like `morrow-theme`). See [open question 1](#10-open-questions).

| Collection      | What it holds                                                                 |
| --------------- | ----------------------------------------------------------------------------- |
| `users`         | People who can log in (and people who were invited by email).                 |
| `pages`         | The task lists in the sidebar. Each is either **private** or **shared**.      |
| `tasks`         | Tasks. Every task belongs to exactly one page.                                |
| `notifications` | Messages shown in the Notifications view (bell icon), one user each.          |

Membership of a page is **not** its own collection. It lives inside each page as the
`members` array.

You will probably also want a place for **password reset tokens** (a small `passwordResets`
collection, or two fields on the user). The front end does not see this.

---

## 2. Fields

"Required" here means **the front end always expects the field to be present in what you send
back**. Even optional values must be sent, as an empty string `''`. The front end does not check
for missing fields.

### `users`

| Field      | Type   | Required | Allowed values / notes |
| ---------- | ------ | -------- | ---------------------- |
| `_id`      | string (ObjectId) | yes | Created by the database. |
| `name`     | string | yes | Not empty. Shown in the sidebar, avatars, share list, export. Initials are built from it. |
| `email`    | string | yes | Must be unique. Compared **case-insensitively** (`maya@x.com` = `MAYA@x.com`). Store trimmed. |
| `password` | string | yes (in DB) | At least 8 characters. **Store a hash (e.g. bcrypt), never plain text.** **Never send it to the front end.** |
| `photo`    | string | yes (can be `''`) | `''` = no photo (initials are shown). Otherwise a **data URL** such as `data:image/png;base64,...`. See [open question 4](#10-open-questions). |

### `pages`

| Field     | Type   | Required | Allowed values / notes |
| --------- | ------ | -------- | ---------------------- |
| `_id`     | string (ObjectId) | yes | |
| `name`    | string | yes | Not empty (trimmed). |
| `type`    | string | yes | `'private'` or `'shared'`. Never changes after creation. |
| `owner`   | string (user `_id`) | yes | The user who created the page. |
| `members` | array of `{ user, role }` | yes | Always includes the owner. See below. |

Each item of `members`:

| Field  | Type   | Required | Allowed values |
| ------ | ------ | -------- | -------------- |
| `user` | string (user `_id`) | yes | |
| `role` | string | yes | `'owner'`, `'editor'` or `'viewer'`. Exactly one `'owner'` per page. |

A **private** page has only one member: the owner.

### `tasks`

| Field          | Type   | Required | Allowed values / notes |
| -------------- | ------ | -------- | ---------------------- |
| `_id`          | string (ObjectId) | yes | |
| `page`         | string (page `_id`) | yes | The page this task is on. |
| `title`        | string | yes | Not empty (trimmed). |
| `description`  | string | yes (can be `''`) | |
| `dueDate`      | string | yes (can be `''`) | `'YYYY-MM-DD'` or `''` (no date). |
| `dueTime`      | string | yes (can be `''`) | `'HH:MM'` 24-hour, or `''`. Always `''` when `dueDate` is `''`. |
| `priority`     | string | yes | `'high'`, `'medium'`, `'low'`. Default `'medium'`. |
| `status`       | string | yes | `'todo'`, `'in-progress'`, `'done'`. Default `'todo'`. |
| `assignee`     | string (user `_id`) | yes (can be `''`) | `''` = unassigned. Only used on **shared** pages. Should be a member of the task's page. |
| `reminder`     | string | yes | `'none'`, `'at-time'`, `'10-min'`, `'1-hour'`, `'1-day'`, `'custom'`. Default `'none'`. |
| `reminderDate` | string | yes (can be `''`) | `'YYYY-MM-DD'`. Only used when `reminder` is `'custom'`. |
| `reminderTime` | string | yes (can be `''`) | `'HH:MM'`. Only used when `reminder` is `'custom'`. |
| `completedAt`  | string | yes (can be `''`) | `'YYYY-MM-DD'` the day the task became done, or `''`. **Set by the backend** (see [section 9](#9-what-the-backend-must-calculate-or-do)). |

> There is **no `createdBy` field** anywhere in the front end. See [open question 6](#10-open-questions).

### `notifications`

| Field       | Type    | Required | Allowed values / notes |
| ----------- | ------- | -------- | ---------------------- |
| `_id`       | string (ObjectId) | yes | |
| `user`      | string (user `_id`) | yes | Who the notification is **for**. |
| `type`      | string  | yes | `'due-soon'`, `'overdue'`, `'assigned'`, `'shared'`. Picks the icon. |
| `message`   | string  | yes | The text shown, e.g. `'Due today at 4:00 PM'`. |
| `task`      | string (task `_id`) | yes (can be `''`) | `''` when it is not about a task (e.g. `'shared'`). |
| `page`      | string (page `_id`) | yes (can be `''`) | The related page. |
| `isRead`    | boolean | yes | `true` / `false`. |
| `timeLabel` | string  | yes | Ready-to-show text like `'1 hour ago'`, `'Yesterday'`. See [open question 7](#10-open-questions). |

---

## 3. IDs and links

### 3a. Which field is the ID

The front end uses **`_id`** for every record: users, pages, tasks, notifications.
It **never** uses `id`. (The only `.id` in the client is inside `components/Toast.jsx`, which is
for on-screen messages and has nothing to do with data.)

Every place that reads `_id`:

| File | What it reads `_id` for |
| ---- | ----------------------- |
| `pages/Login.jsx:43` | `pages[0]._id` → opens the first page after log in |
| `pages/Register.jsx:45` | `pages[0]._id` → opens the first page after registering |
| `pages/TaskList.jsx` lines 90, 116–117, 130, 142, 165–167, 171, 201, 204, 325 | Task `_id` (update, delete, row keys, `?task=` link, the new task's id from `createTask`), user `_id` (assignee lookup) |
| `pages/TaskBoard.jsx` lines 95–96, 108, 153, 157, 234 | Task `_id` (update, delete, keys), user `_id` (assignee avatar) |
| `pages/TaskCalendar.jsx` lines 84–85, 194, 218 | Task `_id` (update, keys) |
| `pages/Dashboard.jsx` lines 59–61 | Page `_id` (count tasks per page) |
| `pages/Notifications.jsx` lines 51, 53, 60–63, 69, 127 | Notification `_id` (mark read, keys), task `_id` and page `_id` (open the related item) |
| `components/Sidebar.jsx` lines 52, 57, 79, 84, 101, 109–110, 131, 133, 151–152, 155, 157, 199, 234 | Page `_id` (links, rename, delete, counts, the new page's id from `createPage`), task `_id` (search results) |
| `components/ShareModal.jsx` lines 21–22, 35, 58, 64, 136, 147, 160 | Page `_id` (share link, member calls), user `_id` (owner check, "(you)", role/remove) |
| `components/TaskForm.jsx` lines 18, 92, 245–247 | Task `_id` (**has `_id` = edit, no `_id` = new**), user `_id` (assignee choices) |
| `components/TaskHeader.jsx` lines 34, 52 | User `_id` (member avatars), page `_id` (view switcher links) |
| `components/ExportModal.jsx` lines 27, 53, 57, 67, 82, 229, 232–233 | Page `_id`, task `_id` (picker), user `_id` (assignee name) |
| `api/api.js` (all functions) | Looks records up by `_id`; this whole file gets replaced by `fetch` calls |

**IDs also appear in URLs** (so they must be URL-safe strings; ObjectId hex strings are fine):

- `/pages/:pageId/list`, `/pages/:pageId/board`, `/pages/:pageId/calendar`
- `/pages/:pageId/list?task=<task _id>` (opens a task, from search and notifications)
- The share link: `<site>/pages/<page _id>/list`

### 3b. Fields that point to another collection

| Field | In collection | Points to | Notes |
| ----- | ------------- | --------- | ----- |
| `page` | `tasks` | `pages._id` | Every task has one. |
| `assignee` | `tasks` | `users._id` | `''` = nobody. Shared pages only. |
| `owner` | `pages` | `users._id` | |
| `members[].user` | `pages` | `users._id` | |
| `user` | `notifications` | `users._id` | Who receives it. |
| `task` | `notifications` | `tasks._id` | `''` if none. |
| `page` | `notifications` | `pages._id` | `''` if none. |

There is **no `createdBy`** on tasks (see [open question 6](#10-open-questions)).

### 3c. ID only, or the full linked object?

**Always send just the ID string. Do not use Mongoose `.populate()` on these fields.**

The front end does the "joining" itself:

- **Assignee name and photo on a board card / list row / export:** the page calls `getUsers()`
  once, then finds the person with `users.find((user) => user._id === task.assignee)`.
- **Member avatars, share list, assignee choices:** same, using `member.user`.
- **Page name in search results, export, notifications:** `pages.find((p) => p._id === task.page)`.
- **Owner check in Share:** `page.owner === currentUser._id`, a plain string comparison.

If you send populated objects instead, all of these comparisons silently fail: no avatars, no
names, and the Share window thinks you are not the owner.

### 3d. IDs the front end makes up today (the backend must create these instead)

In `api.js`, a helper makes fake IDs:

```js
// client/src/api/api.js, line 39
function makeId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}
```

Every place that uses it (all inside `api.js`):

| `api.js` line | Function | What gets a new ID |
| ------------- | -------- | ------------------ |
| 71 | `register` | the new user (`makeId('u')`) |
| 76 | `register` | the new user's first page "My tasks" (`makeId('p')`) |
| 178 | `createPage` | the new page |
| 214 | `inviteMember` | a placeholder user for an email that has no account yet |
| 261 | `createTask` | the new task |

And the hard-coded IDs in `data/mockData.js` (`u1`–`u5`, `p1`–`p4`, `t1`–`t25`, `n1`–`n5`)
are only sample data. Use them as seed data if you want, but let MongoDB create real IDs.

**What the front end needs back after creating something:**

- `createTask` **must return the new task including its `_id`**. `TaskList.jsx:89–90` uses it
  to keep the new task at the bottom of the list.
- `createPage` **must return the new page including its `_id`**. `Sidebar.jsx:76–79` opens it right away.
- The front end **never sends an `_id` when creating**. `TaskForm.jsx:18` decides "new or edit"
  by whether `_id` exists.

Once the backend exists, `makeId` and all five call sites above go away, and `mockData.js`
is no longer imported.

---

## 4. Sample documents

Taken from `client/src/data/mockData.js`. The IDs are the mock ones; yours will be ObjectIds.

### `users` (as stored, with a hashed password)

```json
{
  "_id": "u1",
  "name": "Maya Reyes",
  "email": "maya@morrow.app",
  "password": "<bcrypt hash of 'morrow123'>",
  "photo": ""
}
```

What the API **sends** to the front end (no password):

```json
{ "_id": "u1", "name": "Maya Reyes", "email": "maya@morrow.app", "photo": "" }
```

### `pages`

```json
{
  "_id": "p3",
  "name": "Website relaunch",
  "type": "shared",
  "owner": "u1",
  "members": [
    { "user": "u1", "role": "owner" },
    { "user": "u2", "role": "editor" },
    { "user": "u3", "role": "editor" },
    { "user": "u4", "role": "viewer" }
  ]
}
```

### `tasks`

```json
{
  "_id": "t12",
  "page": "p3",
  "title": "Review pricing page design",
  "description": "Check the annual toggle and the comparison table.",
  "dueDate": "2026-10-09",
  "dueTime": "14:00",
  "priority": "high",
  "status": "todo",
  "assignee": "u2",
  "reminder": "1-hour",
  "reminderDate": "",
  "reminderTime": "",
  "completedAt": ""
}
```

(In the mock file, dates are written as "today + N days" so the demo always looks right.
The example above uses a real date.)

### `notifications`

```json
{
  "_id": "n2",
  "user": "u1",
  "type": "assigned",
  "message": "Daniel Kim assigned this task to you",
  "task": "t15",
  "page": "p3",
  "isRead": false,
  "timeLabel": "3 hours ago"
}
```

---

## 5. API endpoints

The **front-end function names** come from `api.js`. The **method and URL** are suggestions
that fit Express; the front end does not care what the URLs are, only what goes in and comes out.

All endpoints except the auth ones need a logged-in user (see [section 7](#7-auth)).
"Nothing" means the front end ignores the response body, so `204 No Content` is fine.

### Auth

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `login(email, password)` | `POST /api/auth/login` | `{ email, password }` | The user (no password). Errors: wrong email or password. |
| `register(name, email, password)` | `POST /api/auth/register` | `{ name, email, password }` | The new user. **Also create the "My tasks" private page** and log them in. Error: email taken. |
| `logout()` | `POST /api/auth/logout` | nothing | nothing |
| `getCurrentUser()` | `GET /api/auth/me` | nothing | The logged-in user, or **`null`** when nobody is logged in (send `401`; the `fetch` wrapper turns it into `null`). |
| `requestPasswordReset(email)` | `POST /api/auth/forgot-password` | `{ email }` | `{ message }` (not shown). Send the email. |
| `resetPassword(newPassword)` | `POST /api/auth/reset-password` | today: just the new password. **Needs a token too**, see [open question 2](#10-open-questions). Suggested: `{ token, password }` | `{ message }` (not shown) |

```json
// POST /api/auth/login   request
{ "email": "maya@morrow.app", "password": "morrow123" }

// 200 response
{ "_id": "u1", "name": "Maya Reyes", "email": "maya@morrow.app", "photo": "" }

// 401 response
{ "message": "Incorrect email or password." }
```

### Users and profile

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `getUsers()` | `GET /api/users` | nothing | Array of users (no passwords). Used to show names and avatars. See [open question 9](#10-open-questions). |
| `updateProfile(changes)` | `PATCH /api/users/me` | Any of `{ name, email, photo }` (only the ones that changed) | The updated user (not used right now). |
| `changePassword(currentPassword, newPassword)` | `PUT /api/users/me/password` | `{ currentPassword, newPassword }` | `{ message }`. Error when the current password is wrong. |
| `deleteAccount()` | `DELETE /api/users/me` | nothing | nothing. Also log the user out. |

```json
// PATCH /api/users/me   request (photo saved from the Profile page)
{ "photo": "data:image/jpeg;base64,/9j/4AAQSk..." }

// PATCH /api/users/me   request (name/email saved)
{ "name": "Maya Reyes", "email": "maya@morrow.app" }

// 200 response
{ "_id": "u1", "name": "Maya Reyes", "email": "maya@morrow.app", "photo": "data:image/jpeg;base64,/9j/4AAQSk..." }

// PUT /api/users/me/password   request
{ "currentPassword": "morrow123", "newPassword": "newpassword1" }

// 400 response
{ "message": "Current password is incorrect." }
```

### Pages

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `getPages()` | `GET /api/pages` | nothing | Array of pages **where the user is in `members`** (private and shared mixed). Keep a stable order (oldest first): `pages[0]` is opened after log in. |
| `getPage(pageId)` | `GET /api/pages/:id` | nothing | One page, or **`null`** if it does not exist / the user has no access (send `404`; the wrapper returns `null`). Then the page shows "Page not found". |
| `createPage(name, type)` | `POST /api/pages` | `{ name, type }` (type `'private'` / `'shared'`) | The new page **with `_id`**. Owner = logged-in user, `members: [{ user: me, role: 'owner' }]`. |
| `renamePage(pageId, newName)` | `PATCH /api/pages/:id` | `{ name }` | The updated page (not used). |
| `deletePage(pageId)` | `DELETE /api/pages/:id` | nothing | nothing. **Also delete every task on the page.** |

```json
// POST /api/pages   request
{ "name": "Groceries", "type": "private" }

// 201 response
{
  "_id": "6718a2f0c1d2e3f4a5b6c7d8",
  "name": "Groceries",
  "type": "private",
  "owner": "u1",
  "members": [{ "user": "u1", "role": "owner" }]
}
```

### Sharing (members of a page)

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `inviteMember(pageId, email, role)` | `POST /api/pages/:id/members` | `{ email, role }` (role `'editor'` / `'viewer'`) | The updated page (not used; the screen reloads). Error when the person already has access. |
| `updateMemberRole(pageId, userId, role)` | `PATCH /api/pages/:id/members/:userId` | `{ role }` | The updated page (not used). |
| `removeMember(pageId, userId)` | `DELETE /api/pages/:id/members/:userId` | nothing | The updated page (not used). **Also un-assign that person's tasks on this page** (`assignee: ''`). |

```json
// POST /api/pages/p3/members   request
{ "email": "lena@northfield.co", "role": "editor" }

// 200 response: the whole page with the new member added
{ "_id": "p3", "name": "Website relaunch", "type": "shared", "owner": "u1",
  "members": [ { "user": "u1", "role": "owner" }, "...", { "user": "6718b0...", "role": "editor" } ] }

// 409 response
{ "message": "This person already has access." }
```

### Tasks

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `getTasks()` | `GET /api/tasks` | nothing | Every task on every page the user is a member of. |
| `getTasksByPage(pageId)` | `GET /api/pages/:id/tasks` | nothing | The tasks of one page (check access). |
| `createTask(taskData)` | `POST /api/tasks` | A task **without `_id`**: `{ page, title, description, dueDate, dueTime, priority, status, assignee, reminder, reminderDate, reminderTime }`. Some fields may be missing; fill the defaults below. | The new task **with `_id`** and `completedAt`. |
| `updateTask(taskId, changes)` | `PATCH /api/tasks/:id` | Either just `{ status }` (the checkbox in List view) **or the whole task object** from the form (including `_id`, `page`, `completedAt`). | The updated task (not used). |
| `deleteTask(taskId)` | `DELETE /api/tasks/:id` | nothing | nothing |

Defaults for `createTask` (copied from `api.js`): `description ''`, `dueDate ''`, `dueTime ''`,
`priority 'medium'`, `status 'todo'`, `assignee ''`, `reminder 'none'`, `reminderDate ''`,
`reminderTime ''`, `completedAt` = today if `status` is `'done'`, else `''`.

For `updateTask`, **only accept the editable fields**: `title`, `description`, `dueDate`,
`dueTime`, `priority`, `status`, `assignee`, `reminder`, `reminderDate`, `reminderTime`.
Ignore `_id`, `page` and `completedAt` in the body, because the form sends them back unchanged.

```json
// POST /api/tasks   request (the inline "Add a task" row in List view)
{
  "page": "p1", "title": "Buy stamps", "description": "",
  "dueDate": "2026-10-12", "dueTime": "", "priority": "medium", "status": "todo",
  "assignee": "", "reminder": "none", "reminderDate": "", "reminderTime": ""
}

// 201 response
{
  "_id": "6718c3a1...", "page": "p1", "title": "Buy stamps", "description": "",
  "dueDate": "2026-10-12", "dueTime": "", "priority": "medium", "status": "todo",
  "assignee": "", "reminder": "none", "reminderDate": "", "reminderTime": "",
  "completedAt": ""
}

// PATCH /api/tasks/t3   request (checkbox in List view)
{ "status": "done" }

// 200 response
{ "_id": "t3", "page": "p1", "title": "Draft October budget", "...": "...",
  "status": "done", "completedAt": "2026-10-09" }
```

### Notifications

| Function | Method + URL | Front end sends | Front end expects back |
| -------- | ------------ | --------------- | ---------------------- |
| `getNotifications()` | `GET /api/notifications` | nothing | The logged-in user's notifications, **newest first** (the list is shown in the order received). |
| `setNotificationRead(notificationId, isRead)` | `PATCH /api/notifications/:id` | `{ isRead: true }` (the front end only ever sends `true` now) | The updated notification (not used). |
| `markAllNotificationsRead()` | `POST /api/notifications/read-all` | nothing | nothing |
| `clearReadNotifications()` | `DELETE /api/notifications/read` | nothing | nothing. Deletes the user's notifications where `isRead` is `true`. |

```json
// GET /api/notifications   response
[
  { "_id": "n1", "user": "u1", "type": "due-soon", "message": "Due today at 4:00 PM",
    "task": "t2", "page": "p1", "isRead": false, "timeLabel": "1 hour ago" },
  { "_id": "n4", "user": "u1", "type": "shared", "message": "Priya Nair shared a page with you",
    "task": "", "page": "p4", "isRead": true, "timeLabel": "Yesterday" }
]
```

> **Express tip:** register `/api/notifications/read-all` and `/api/notifications/read`
> **before** `/api/notifications/:id`, or Express will treat `read` as an `:id`.

---

## 6. Where each endpoint is used

| Function | Called from |
| -------- | ----------- |
| `login` | `pages/Login.jsx` |
| `register` | `pages/Register.jsx` |
| `logout` | `components/Sidebar.jsx` (log out button), `pages/Profile.jsx` (log out button) |
| `getCurrentUser` | `components/Layout.jsx` (**on every screen change**, to check log in), `pages/Profile.jsx`, `pages/TaskList.jsx`, `pages/TaskBoard.jsx`, `pages/TaskCalendar.jsx` |
| `requestPasswordReset` | `pages/ForgotPassword.jsx`, `pages/CheckEmail.jsx` (Resend) |
| `resetPassword` | `pages/ResetPassword.jsx` |
| `getUsers` | `pages/TaskList.jsx`, `pages/TaskBoard.jsx`, `pages/TaskCalendar.jsx`, `pages/Dashboard.jsx` |
| `updateProfile` | `pages/Profile.jsx` (save name/email, save photo, remove photo) |
| `changePassword` | `pages/Profile.jsx` |
| `deleteAccount` | `pages/Profile.jsx` |
| `getPages` | `components/Layout.jsx` (sidebar), `pages/Login.jsx`, `pages/Register.jsx`, `pages/Dashboard.jsx`, `pages/Notifications.jsx` |
| `getPage` | `pages/TaskList.jsx`, `pages/TaskBoard.jsx`, `pages/TaskCalendar.jsx` |
| `createPage` | `components/Sidebar.jsx` |
| `renamePage` | `components/Sidebar.jsx` |
| `deletePage` | `components/Sidebar.jsx` |
| `inviteMember` | `components/ShareModal.jsx` |
| `updateMemberRole` | `components/ShareModal.jsx` |
| `removeMember` | `components/ShareModal.jsx` |
| `getTasks` | `components/Layout.jsx` (sidebar counts and search), `pages/Dashboard.jsx`, `pages/Notifications.jsx` |
| `getTasksByPage` | `pages/TaskList.jsx`, `pages/TaskBoard.jsx`, `pages/TaskCalendar.jsx` |
| `createTask` | `pages/TaskList.jsx` (inline row + form), `pages/TaskBoard.jsx` (column "+ Add task" + form), `pages/TaskCalendar.jsx` (form) |
| `updateTask` | `pages/TaskList.jsx` (form + done checkbox), `pages/TaskBoard.jsx` (form), `pages/TaskCalendar.jsx` (form) |
| `deleteTask` | `pages/TaskList.jsx`, `pages/TaskBoard.jsx` (Calendar has no delete) |
| `getNotifications` | `components/Layout.jsx` (unread badge on the bell), `pages/Notifications.jsx` |
| `setNotificationRead` | `pages/Notifications.jsx` (click a notification, or "Mark as read") |
| `markAllNotificationsRead` | `pages/Notifications.jsx` |
| `clearReadNotifications` | `pages/Notifications.jsx` |

Note: `Layout.jsx` reloads the user, pages, tasks and notifications **every time the URL changes**
and after most edits. That is 4 requests per screen change, so keep these endpoints fast.

---

## 7. Auth

### How the front end knows who is logged in today

`api.js` saves the user's `_id` in the browser (`localStorage`, key `morrow-user-id`), and every
function filters by it. **This is not secure. Replace it.** Suggested approach:

- On log in / register, the backend sets an **httpOnly cookie** with a session or JWT.
- Every request sends the cookie (`fetch(url, { credentials: 'include' })`).
- `GET /api/auth/me` returns the user from the cookie, or `401`.
- The `fetch` wrapper for `getCurrentUser` turns `401` into `null`.

`components/Layout.jsx` calls `getCurrentUser()` on every screen change. If it gets `null`,
it sends the person to `/login`. That is the only "guard" in the front end.

### Each auth screen

| Screen | Calls | Sends | Expects | Then |
| ------ | ----- | ----- | ------- | ---- |
| Log in (`/login`) | `login`, then `getPages` | email, password | user, or error `'Incorrect email or password.'` | Opens `pages[0]`, or `/dashboard` if there are no pages. Error shows under the **password** field. |
| Register (`/register`) | `register`, then `getPages` | name, email, password | user, or error `'An account with this email already exists.'` | Opens `pages[0]`. **This crashes if there are no pages**, so register must create "My tasks". Error shows under the **email** field. Shows the "Account created" message. |
| Forgot password (`/forgot-password`) | `requestPasswordReset` | email | anything | Goes to `/check-email`. The screen says the link **"expires in 30 minutes"**. |
| Check email (`/check-email`) | `requestPasswordReset` (Resend) | email | anything | Today a button "Open the reset link" stands in for the real email link. |
| Reset password (`/reset-password`) | `resetPassword` | new password (no token yet) | anything | Goes to `/password-updated`. **No error handling**, see [open question 2](#10-open-questions). |
| Log out (Sidebar or Profile) | `logout` | nothing | nothing | Goes to `/login`. |

### Which pages need a logged-in user

**Need log in** (they use `Layout`):
`/dashboard`, `/notifications`, `/profile`, `/pages/:pageId/list`, `/pages/:pageId/board`,
`/pages/:pageId/calendar`.

**Public:** `/login`, `/register`, `/forgot-password`, `/check-email`, `/reset-password`,
`/password-updated`. (`/` and unknown URLs redirect to `/login`.)

**On the backend:** every `/api/...` route except `login`, `register`, `forgot-password`,
`reset-password` (and `me`, which answers `401`) must check the cookie.

### Permissions the backend should enforce

The front end only hides a few buttons. **The backend must check access itself**:

- A user can only see pages, tasks and notifications for pages where they are in `members`.
- Only the page **owner** can invite, change roles, or remove members (the Share window shows
  these controls only to the owner: `page.owner === currentUser._id`).
- Nobody can change or remove the `'owner'` member.
- Viewers: see [open question 10](#10-open-questions).

---

## 8. Validation and errors

### Rules the forms already check (the backend should check the same)

| Form | Field | Rule | Message shown |
| ---- | ----- | ---- | ------------- |
| Log in | email | not empty | `Enter your email.` |
| | email | valid format* | `Enter a valid email address.` |
| | password | not empty | `Enter your password.` |
| Register | name | not empty (trimmed) | `Enter your name.` |
| | email | not empty | `Enter your email.` |
| | email | valid format* | `Enter a valid email address.` |
| | password | at least 8 characters | `Use at least 8 characters.` |
| | confirm password | not empty / same as password | `Confirm your password.` / `Passwords do not match.` |
| Forgot password | email | not empty / valid format* | `Enter your email.` / `Enter a valid email address.` |
| Reset password | password | at least 8 characters | `Use at least 8 characters.` |
| | confirm | not empty / same | `Confirm your new password.` / `Passwords do not match.` |
| Profile | name | not empty (trimmed) | `Enter your name.` |
| | email | valid format* | `Enter a valid email address.` |
| Profile → password | current | not empty | `Enter your current password.` |
| | new | at least 8 characters | `Use at least 8 characters.` |
| | confirm | same as new | `Passwords do not match.` |
| Task form | title | not empty (trimmed) | `Give the task a title.` |
| | reminder | `at-time` / `10-min` / `1-hour` / `1-day` need a `dueDate` | `Set a due date to use this reminder.` |
| | reminder | `custom` needs both `reminderDate` and `reminderTime` | `Pick both a date and a time for the reminder.` |
| | dueTime | cleared when there is no due date | (silent) |
| List inline row | title | not empty | (red border, no text) |
| Board "+ Add task" | title | not empty | `Give the task a title.` |
| Sidebar new/rename page | name | not empty (trimmed) | (silently cancels) |
| Share → invite | email | not empty / valid format* | `Enter an email address.` / `Enter a valid email address.` |
| Export | dates | "from" not after "to" | `The start date must be before the end date.` (front end only) |

\* "Valid format" is this check from `utils/helpers.js`: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
(something@something.something, no spaces).

### Error responses

In `api.js`, a failure is a thrown `Error`, and the screens show **`error.message`** as-is.
So, please send errors as:

```json
{ "message": "Human-readable text to show the user." }
```

with a 4xx status code. The `fetch` wrapper in `api.js` will do roughly
`if (!response.ok) throw new Error((await response.json()).message)`.

**Error messages the front end shows today (please use the same text):**

| Endpoint | When | Status (suggested) | `message` | Where it appears |
| -------- | ---- | ------------------ | --------- | ---------------- |
| `POST /api/auth/login` | wrong email or password | 401 | `Incorrect email or password.` | under the password field |
| `POST /api/auth/register` | email already used | 409 | `An account with this email already exists.` | under the email field |
| `PUT /api/users/me/password` | current password wrong | 400 | `Current password is incorrect.` | under "Current password" |
| `POST /api/pages/:id/members` | person already a member | 409 | `This person already has access.` | under the invite field |

**Endpoints whose errors the front end does NOT catch yet** (an error would just be ignored in
the console): `updateProfile` (e.g. email already taken), `resetPassword` (e.g. expired link),
`requestPasswordReset`, and all page/task/notification calls. See [open question 3](#10-open-questions).

---

## 9. What the backend must calculate or do

### Things the mock fakes that the backend must really do

| What | Today (mock) | Backend must |
| ---- | ------------ | ------------ |
| **IDs** | `makeId()` in `api.js` | Let MongoDB create them ([section 3d](#3d-ids-the-front-end-makes-up-today-the-backend-must-create-these-instead)). |
| **Passwords** | stored and compared as plain text | Hash with bcrypt; never return `password`. |
| **Who is logged in** | `localStorage` user id | Cookie session / JWT ([section 7](#7-auth)). |
| **First page on register** | `register` creates "My tasks" | Same: create a private page named `My tasks`. |
| **`completedAt`** | `createTask` / `updateTask` set it | When `status` becomes `'done'` and `completedAt` is empty → set to today (`'YYYY-MM-DD'`). When `status` is anything else → set to `''`. The Dashboard's "completed per week" chart depends on this. |
| **Delete page** | also deletes its tasks | Same. (Also decide about its notifications: [open question 8](#10-open-questions).) |
| **Remove member** | un-assigns their tasks on that page | Same. |
| **Delete account** | deletes the user, every page they own **(including shared ones, for all members)** and those pages' tasks; removes them from other pages' `members` | Same, and decide the open points in [question 8](#10-open-questions). |
| **Invite unknown email** | creates a "placeholder" user with no password and the email's first part as `name` | Decide how invites really work: [open question 5](#10-open-questions). |
| **Password reset email** | nothing is sent; the "Check your email" screen has a fake "Open the reset link" button | Create a token (expires in **30 minutes**, as the screen says), email a link like `/reset-password?token=...`. |
| **Notifications** | 5 fixed sample notifications that never change | Create them for real (below). |
| **`timeLabel`** | fixed text like `"1 hour ago"` | Compute from the creation time ([open question 7](#10-open-questions)). |
| **Reminders** | only saved; the form shows "You will be reminded …" but **nothing ever fires** | Schedule and deliver them (below). |

### Notifications to create

The four `type` values and the sample messages tell us when each should be made:

| `type` | When | Sample `message` | `task` / `page` |
| ------ | ---- | ---------------- | --------------- |
| `assigned` | Someone sets a task's `assignee` to another user (create/update) | `Daniel Kim assigned this task to you` (`<actor name> assigned this task to you`) | the task / its page |
| `shared` | Someone is invited to a page (`inviteMember`) | `Priya Nair shared a page with you` (`<owner name> shared a page with you`) | `''` / the page |
| `due-soon` | A not-done task is due soon (sample: due **today**) | `Due today at 4:00 PM` | the task / its page |
| `overdue` | A not-done task's due date has passed | `This task is overdue` | the task / its page |

For `due-soon` and `overdue`, a scheduled job is needed (for example `node-cron` every few minutes),
and you must avoid creating the same one twice. Who receives them is not decided:
[open question 11](#10-open-questions).

The task name under each notification is **not** stored; the front end looks it up from
`task` / `page`. Times are shown 12-hour, like `4:00 PM` (see `formatTime` in `utils/helpers.js`).

### Reminders

How the form explains the reminder time (`TaskForm.jsx`, `getReminderText`), so the backend should use the same rule:

- `at-time`: at `dueDate` + `dueTime`
- `10-min` / `1-hour` / `1-day`: that long **before** `dueDate` + `dueTime`
- If there is **no `dueTime`, 9:00 AM** on the due date is used
- `custom`: at `reminderDate` + `reminderTime`
- `none`: no reminder

How a reminder reaches the user is not decided: [open question 12](#10-open-questions).

### Things the backend does NOT need to calculate (the front end already does them)

These are **not faked**. They are computed in the browser from the real tasks and pages, so the
backend only needs to return correct data:

| What | Computed in | From |
| ---- | ----------- | ---- |
| Dashboard numbers: Completed, Open, Overdue, Completion rate | `pages/Dashboard.jsx` | `getTasks()` |
| Dashboard charts: completed per week (last 6 weeks), completed vs overdue per page, by priority, by status | `pages/Dashboard.jsx` | `getTasks()` (`completedAt`, `status`, `priority`, `dueDate`), `getPages()` |
| Sidebar open-task count per page | `components/Sidebar.jsx` | `getTasks()`: tasks where `status !== 'done'` |
| Sidebar search | `components/Sidebar.jsx` | `getTasks()`: title + description |
| Unread badge on the bell | `components/Layout.jsx` | `getNotifications()`: `isRead === false` |
| Overdue (red date) | `utils/helpers.js` `isOverdue` | not done, has `dueDate`, `dueDate` < today |
| Filters and sorting | `utils/helpers.js` `filterAndSortTasks` | task fields |
| **Export CSV / PDF** | `components/ExportModal.jsx` | The CSV file is built in the browser; the "PDF" is a printable page opened in a new window (use "Save as PDF"). No server needed. |

"Today" and "overdue" use the **browser's local date**. Any backend jobs that decide "today"
(`completedAt`, due-soon, overdue) must agree with that: [open question 13](#10-open-questions).

If later you want the server to do these instead (for speed with lots of tasks), we can
add endpoints like `GET /api/dashboard` and `GET /api/export?format=csv`. They are not needed now.

---

## 10. Open questions

Things that are unclear or inconsistent. We need to decide these together.

1. **Database name.** Not in the code. Proposal: `morrow`.

2. **Password reset has no token.** `resetPassword(newPassword)` only sends the new password;
   the mock remembers the email in `sessionStorage`. The real flow needs
   `/reset-password?token=...` in the email link, and `ResetPassword.jsx` + `api.js` must send
   `{ token, password }`. Also, `ResetPassword.jsx` has **no error handling** (expired or used
   token), and `CheckEmail.jsx` has a stand-in "Open the reset link" button that should be
   removed. Should forgot-password always answer "sent" even for unknown emails? (Recommended, so
   nobody can find out which emails have accounts.)

3. **Errors that are not shown.** `Profile.jsx` does not catch errors from `updateProfile`, so
   "email already in use" would fail silently. Same for page, task and notification calls. Do we
   add messages in the front end (and with what text)?

4. **Profile photo is a base64 data URL inside the user document.** This can be large
   (several MB). Express's default JSON limit is **100 kb**, so photo saves will fail unless we
   raise it (`express.json({ limit: '5mb' })`) or switch to a file upload (e.g. `multer`) and
   store a URL. Also `getUsers()` returns everyone's photos on every task screen, which gets heavy.
   Which approach, and what size limit?

5. **Inviting an email that has no account.** The mock creates a "placeholder" user with an
   empty password. Problems: that person can never register (the email is "taken"), and the name
   is just the part before `@`. Options: a pending-invites collection that is attached when they
   register, or let register "claim" a placeholder user. Should an invite email be sent?

6. **`createdBy` does not exist.** No task field records who created it. Do we want it (for
   example for the `assigned` notification text, or an activity history)? If yes, it must be
   added to `mockData.js`, `api.js` and this document.

7. **`timeLabel` is ready-made text.** A database should store a real time (e.g. `createdAt`)
   instead. Options: (a) backend sends `timeLabel` computed at request time, or (b) backend sends
   `createdAt` and we change `Notifications.jsx:142` to format it. Which one? Mongoose
   `timestamps: true` would give every collection `createdAt` / `updatedAt`, which the front end
   currently ignores.

8. **What happens to related data on delete?**
   - Delete a task or a page: delete its notifications too? (Today they stay; the front end
     shows them without a task name.)
   - Delete account: also un-assign that user's tasks on other people's pages? Delete their
     notifications? (The mock does neither.) Deleting a **shared** page the user owns removes it
     for every member. Is that wanted, or should ownership move to someone else?

9. **`getUsers()` returns every user in the system** (name, email, photo). For privacy it should
   probably return only people who share a page with you. The front end only needs those.
   OK to limit it?

10. **Viewers can edit.** The `'viewer'` role exists, but the front end **does not restrict
    anything** for viewers: they can add, edit, delete tasks, rename and even delete the shared
    page. Should the backend block viewers (and who may rename/delete a shared page: owner only?)?
    If yes, the front end should also hide those buttons.

11. **Who gets `due-soon` / `overdue` notifications**, and when? Only the assignee? Everyone on
    the page? Private pages → the owner? How soon is "due soon" (the sample says "Due today")?

12. **How are reminders delivered?** There is no `'reminder'` notification type. Options: reuse
    `'due-soon'`, add a new type (needs an icon in `Notifications.jsx` `TYPE_ICONS`), and/or send
    email.

13. **Time zone for "today".** Dates are plain `'YYYY-MM-DD'` text and "today" comes from the
    browser's clock. The server may be in another time zone (e.g. UTC), so `completedAt`,
    overdue checks and reminders can be off by a day. Store the user's time zone? Or let the
    front end send its local date?

14. **Empty values are `''`, not `null`.** The front end relies on this: `form.assignee === ''`
    in `TaskForm.jsx` (the "Unassigned" button), `task.dueDate !== ''` in `isOverdue`, and string
    comparisons for sorting. If the database stores `null` or leaves fields out, either convert
    to `''` in the API responses, or we change the front end. Same for `dueDate` and `dueTime`:
    keep them as **strings**, not `Date`. Which way do we go?

15. **Field names that differ between files.** I checked `mockData.js`, `api.js`,
    `utils/helpers.js`, `client/README.md` and every page/component: **the spelling and casing of
    every field match everywhere.** Small differences to be aware of:
    - `makeEmptyTask()` in `utils/helpers.js` has no `completedAt` (fine; the backend sets it).
    - `members[].user` and `notifications.user` are both called `user`, but mean different things
      (a member vs. the receiver).
    - `notifications.page` repeats the page of `notifications.task`.
    - `client/README.md` says `dueDate` is `YYYY-MM-DD` but does not mention that `''` is also
      allowed; `mockData.js` does.

16. **`setNotificationRead` still accepts `false`.** The front end no longer offers
    "Mark as unread", so it always sends `true`. Should the endpoint only allow `true`?

17. **Changing your email.** Should it require the password, or a confirmation email? Today it
    saves right away.

18. **Demo login.** `Login.jsx` lines 16–17 pre-fill `maya@morrow.app` / `morrow123`. Remove
    once the backend is connected (the comment there says so). Do we seed this demo account?

---

### Quick checklist for connecting the front end later

- [ ] Replace every function body in `client/src/api/api.js` with a `fetch` call (keep names and arguments).
- [ ] Use `credentials: 'include'` so the login cookie is sent.
- [ ] Turn `401` from `/api/auth/me` into `null`, and `404` from `GET /api/pages/:id` into `null`.
- [ ] Turn other non-OK responses into `throw new Error(body.message)`.
- [ ] Remove `makeId`, `makeCopy`, `hidePassword`, the in-memory arrays and the `mockData.js` import.
- [ ] Remove the `morrow-user-id` (`localStorage`) and `morrow-reset-email` (`sessionStorage`) keys.
- [ ] Add a Vite proxy (`server.proxy` in `client/vite.config.js`) so `/api` reaches Express during development.
