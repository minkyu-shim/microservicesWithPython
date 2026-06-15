# Frontend Update Plan — Modules 1–6 Coverage

The current frontend only reads users and games. Auth, activities, notifications, and the GDPR/consent surface are missing entirely. This document is the implementation roadmap to bring the frontend up to date.

All API shapes are defined in `api-contracts.md`. This document covers *what to build and in what order*, not the shapes themselves.

---

## Dependency order

Phases must be done in order. Phase 0 is a hard blocker — every authenticated API call will fail until the token infrastructure is in place.

```
Phase 0 (Auth)
  └── Phase 1 (Create forms)
  └── Phase 2 (Activities)
  └── Phase 3 (Notifications)
  └── Phase 4 (GDPR)
       Phase 5 (Mock mode) — runs in parallel with each phase above
```

---

## Phase 0 — Auth Foundation

> Everything else is blocked on this.

### `src/context/AuthContext.tsx` (new)

React context that owns all auth state for the app.

State:
- `token: string | null` — raw JWT from `POST /v1/auth/token`
- `me: { sub: string; role: string; exp: number } | null` — from `GET /v1/auth/me`
- `isAuthenticated: boolean` — derived from `token != null`

Methods:
- `login(username, password)` — calls token endpoint, stores token, then fetches `/v1/auth/me`
- `logout()` — clears token and me

Storage: `localStorage` key `gamehub_token`. On mount, if a stored token exists, call `GET /v1/auth/me` to validate it. If 401, clear storage and treat as logged out.

Export `AuthProvider` (wraps the app) and `useAuth()` hook.

### `src/api/client.ts` (modify)

Two changes:

1. **Token injection** — add a module-level `setTokenGetter(fn: () => string | null)` export. `AuthProvider` calls this on mount. Inside `request()`, read the token and add `Authorization: Bearer <token>` when present. This avoids a circular dependency between `api/` and React context.

2. **`postForm<T>(path, params: URLSearchParams)`** — sends `application/x-www-form-urlencoded` body. Required for `POST /v1/auth/token` which uses OAuth2 password flow (FastAPI requires form encoding, not JSON).

### `src/api/auth.ts` (new)

```ts
interface TokenResponse { access_token: string; token_type: string }
interface MeResponse    { sub: string; role: string; exp: number }

authApi = {
  login(username, password) → postForm<TokenResponse>('/v1/auth/token', body)
  me()                      → api.get<MeResponse>('/v1/auth/me')
}
```

### `src/pages/LoginPage.tsx` (new)

Centered form: username + password. On submit calls `auth.login()`. Inline error on bad credentials. On success, navigate to `/` (or the page the user was trying to reach via React Router location state). No nav bar on this page.

### `src/components/ProtectedRoute.tsx` (new)

Reads `isAuthenticated` from `useAuth()`. If false, redirects to `/login` with `state={{ from: location }}`. Wrap all private routes with this.

### `src/main.tsx` (modify)

Wrap `<BrowserRouter>` with `<AuthProvider>`. Small change, required before login works.

### `src/App.tsx` (modify)

- Add `/login` route (not protected).
- Wrap all existing and new routes in `<ProtectedRoute>`.
- Expand nav to include all new sections (see final nav structure below).
- Add logout button that calls `auth.logout()` and redirects to `/login`.
- Show `me?.sub` (logged-in username) in the top-right of the nav.

---

## Phase 1 — Create Forms (Modules 1–2)

### `src/components/CreateUserForm.tsx` (new)

Fields: `username`, `email`, `password`. On submit calls `usersApi.create()`. Shows success banner with the new username. Self-contained — embed at top of `UsersPage`.

### `src/pages/UsersPage.tsx` (modify)

Import and render `<CreateUserForm />` above the list. On creation success, prepend the new user to local state (no refetch needed).

### `src/components/CreateGameForm.tsx` (new)

Fields: `title` (required), `genre` (required), `platform` (required), `release_year` (number, optional), `cover_url` (URL, optional). On submit calls `gamesApi.create()`. Embed at top of `GamesPage`.

### `src/pages/GamesPage.tsx` (modify)

Import and render `<CreateGameForm />` above the search bar. On creation success, prepend to local state.

### `src/api/games.ts` (modify)

Add:
```ts
interface GameSummary { id: string; title: string; genre: string; platform: string }

summary: (id: string) => api.get<GameSummary>(`/v1/games/${id}/summary`)
```

---

## Phase 2 — Activity Feed (Module 3)

### `src/api/activities.ts` (new)

```ts
interface GameNested    { id, title, genre, platform, cover_url: string | null }
interface Activity      { id, user_id, action, duration_minutes: number | null, created_at, game: GameNested | null }
interface ActivityList  { items: Activity[], total, limit, offset }
interface ActivityCreate { user_id, game_id, action: 'played'|'completed'|'reviewed'|'wishlist_added', duration_minutes?: number }

activitiesApi = {
  list(limit, offset)               → GET /v1/activities
  listByUser(userId, limit, offset) → GET /v1/activities/user/{userId}
  create(data: ActivityCreate)      → POST /v1/activities
}
```

Note: `action` is a `GameNested` inline, not a reference to `GameSummary` from `games.ts` — name them differently to avoid confusion.

### `src/pages/ActivitiesPage.tsx` (new)

Two sections:

**Global feed** — calls `activitiesApi.list()`. Each row shows: game cover thumbnail (if present), game title, action badge, duration, timestamp.

**Log Activity form** — fields: `user_id` (free-text UUID — see note below), `game_id` (free-text UUID), `action` (`<select>` with the four enum values), `duration_minutes` (number, optional). On submit calls `activitiesApi.create()`. On success, prepends the returned activity to the feed.

> **Note on user_id**: `me.sub` is a username string (e.g. `"testuser"`), not a UUID. The activity endpoint requires a UUID that matches a real user in user-service. The form accepts a free-text UUID for now. A follow-up improvement would be a dropdown populated from `usersApi.list()`.

---

## Phase 3 — Notifications (Module 4)

### `src/api/notifications.ts` (new)

```ts
interface Notification      { id, user_id, type, message, read: boolean, created_at }
interface NotificationList  { items: Notification[], total, limit, offset }
interface MarkReadResponse  { id: string, read: true }

notificationsApi = {
  listByUser(userId, limit, offset) → GET /v1/notifications/{userId}
  markRead(notificationId)          → PATCH /v1/notifications/{notificationId}/read
}
```

> **Known backend gap**: the notification-service does not yet implement `PATCH /v1/notifications/:id/read`. Build the frontend anyway — it works fully in mock mode and will work live once the backend route is added.

Normalization note: if the backend returns a raw array instead of the paginated envelope, normalize it in this file:
```ts
Array.isArray(data) ? { items: data, total: data.length, limit, offset } : data
```

### `src/pages/NotificationsPage.tsx` (new)

User ID input at the top (free-text). On "Load" calls `notificationsApi.listByUser(userId)`. Each row shows: message, type badge, read/unread indicator, "Mark read" button. "Mark read" calls `markRead(id)` and flips local state immediately.

---

## Phase 4 — GDPR / Consent (Modules 5–6)

### `src/api/consent.ts` (new)

```ts
interface ConsentRecord { user_id: string; granted: boolean; updated_at: string }
interface ErasureResult { user_id: string; deleted_entries: number }

consentApi = {
  get(userId)          → GET /v1/consent/{userId}
  set(userId, granted) → POST /v1/consent/{userId}  body: { granted }
  withdraw(userId)     → DELETE /v1/consent/{userId}
  eraseLogs(userId)    → DELETE /v1/logs/{userId}
}
```

### `src/pages/GdprPage.tsx` (new)

Two panels:

**Consent panel** — user ID input. "Check" button calls `consentApi.get(userId)` and shows current `granted` status + `updated_at`. Two action buttons: "Grant consent" → `consentApi.set(userId, true)`, "Withdraw consent" → `consentApi.withdraw(userId)`. Update displayed status after each action.

**Data erasure panel** — user ID input. Red "Erase all logs" button with a confirmation step (inline confirmation state or `window.confirm`). Calls `consentApi.eraseLogs(userId)`. Shows `deleted_entries` count in a success banner. Display a clear warning that the action is irreversible.

---

## Phase 5 — Mock Mode Extension

Run in parallel with each phase above.

### `src/api/mock-data.json` (modify)

Add new top-level keys:

```json
{
  "activities": {
    "items": [
      {
        "id": "act-1",
        "user_id": "<uuid matching a seeded user>",
        "action": "played",
        "duration_minutes": 90,
        "created_at": "2025-03-01T10:00:00Z",
        "game": { "id": "<uuid>", "title": "Hollow Knight", "genre": "metroidvania", "platform": "PC", "cover_url": null }
      }
    ],
    "total": 1
  },
  "notifications": {
    "items": [
      {
        "id": "n-1",
        "user_id": "<uuid>",
        "type": "activity_notification",
        "message": "nova just played Hollow Knight",
        "read": false,
        "created_at": "2025-03-01T10:00:00Z"
      }
    ],
    "total": 1
  }
}
```

Consent state is runtime-only — no seed data needed.

### `src/api/mock.ts` (modify)

Add mock implementations:
- `mockAuthApi` — hardcodes `testuser / password` → fake token + fake `me` object
- `mockActivitiesApi` — in-memory array from seed data; `create()` appends and returns
- `mockNotificationsApi` — in-memory array; `markRead(id)` flips `read` flag
- `mockConsentApi` — in-memory map `userId → ConsentRecord`; `eraseLogs()` returns random count

Each new API module uses the same pattern:
```ts
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const activitiesApi = USE_MOCK ? mockActivitiesApi : { /* real */ }
```

---

## Final Navigation Structure

```
[ Users ] [ Games ] [ Activities ] [ Notifications ] [ GDPR ]          testuser  [ Log out ]
```

| Route          | Page                  | Protected |
|----------------|-----------------------|-----------|
| `/login`       | LoginPage             | No        |
| `/users`       | UsersPage             | Yes       |
| `/games`       | GamesPage             | Yes       |
| `/activities`  | ActivitiesPage        | Yes       |
| `/notifications` | NotificationsPage   | Yes       |
| `/gdpr`        | GdprPage              | Yes       |
| `*`            | fallback text         | Yes       |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `localStorage` for token | Session survives hard refresh. XSS trade-off is acceptable for a course project. |
| `setTokenGetter` registration in `client.ts` | Avoids circular dependency between `api/` modules and React context. |
| No auto-redirect on 401 | Keeps it simple. Pages show an inline "Unauthorized" error. A full app would hook 401 responses in `client.ts` and call `logout()`. |
| Free-text UUID for `user_id` in activity form | `me.sub` is a username, not a UUID. A dropdown from `usersApi.list()` would be the right fix but is out of scope here. |
| Notification PATCH built anyway | Backend gap is known. Frontend + mock work now; live will follow when the route is added. |
