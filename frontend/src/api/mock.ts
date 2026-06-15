import data from './mock-data.json'
import type { User, UserList, UserCreate } from './users'
import type { Game, GameList, GameCreate, GameSummary } from './games'
import type { Activity, ActivityList, ActivityCreate, GameNested } from './activities'
import type { Notification, NotificationList, MarkReadResponse } from './notifications'
import type { ConsentRecord, ErasureResult } from './consent'
import type { TokenResponse, MeResponse } from './auth'

const delay = (ms = 300) => new Promise<void>(res => setTimeout(res, ms))

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const mockUsersApi = {
  list: async (limit = 20, offset = 0): Promise<UserList> => {
    await delay()
    const items = data.users.items.slice(offset, offset + limit) as User[]
    return { items, total: data.users.total, limit, offset }
  },

  get: async (id: string): Promise<User> => {
    await delay()
    const user = data.users.items.find(u => u.id === id) as User | undefined
    if (!user) throw new Error('User not found')
    return user
  },

  create: async (body: UserCreate): Promise<User> => {
    await delay()
    return {
      id: crypto.randomUUID(),
      username: body.username,
      email: body.email,
      is_active: true,
      created_at: new Date().toISOString(),
    }
  },
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export const mockGamesApi = {
  list: async (limit = 20, offset = 0): Promise<GameList> => {
    await delay()
    const items = data.games.items.slice(offset, offset + limit) as Game[]
    return { items, total: data.games.total, limit, offset }
  },

  get: async (id: string): Promise<Game> => {
    await delay()
    const game = data.games.items.find(g => g.id === id) as Game | undefined
    if (!game) throw new Error('Game not found')
    return game
  },

  search: async (q: string, limit = 20, offset = 0): Promise<GameList> => {
    await delay()
    const lower = q.toLowerCase()
    const all = data.games.items.filter(g =>
      g.title.toLowerCase().includes(lower)
    ) as Game[]
    return { items: all.slice(offset, offset + limit), total: all.length, limit, offset }
  },

  create: async (body: GameCreate): Promise<Game> => {
    await delay()
    return {
      id: crypto.randomUUID(),
      title: body.title,
      genre: body.genre,
      platform: body.platform,
      release_year: body.release_year ?? null,
      cover_url: body.cover_url ?? null,
      created_at: new Date().toISOString(),
    }
  },

  summary: async (id: string): Promise<GameSummary> => {
    await delay()
    const game = data.games.items.find(g => g.id === id)
    if (!game) throw new Error('Game not found')
    return { id: game.id, title: game.title, genre: game.genre, platform: game.platform }
  },
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const mockAuthApi = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    await delay()
    if (username === 'testuser' && password === 'password') {
      return { access_token: 'mock-token', token_type: 'bearer' }
    }
    throw new Error('Incorrect username or password')
  },

  me: async (): Promise<MeResponse> => {
    await delay()
    return { sub: 'testuser', role: 'gamer', exp: 9999999999 }
  },
}

// ---------------------------------------------------------------------------
// Activities  (mutable in-memory list)
// ---------------------------------------------------------------------------

const activityStore: Activity[] = data.activities.items.map(a => ({
  ...a,
  game: a.game as GameNested | null,
}))

export const mockActivitiesApi = {
  list: async (limit = 20, offset = 0): Promise<ActivityList> => {
    await delay()
    const items = activityStore.slice(offset, offset + limit)
    return { items, total: activityStore.length, limit, offset }
  },

  listByUser: async (userId: string, limit = 20, offset = 0): Promise<ActivityList> => {
    await delay()
    const filtered = activityStore.filter(a => a.user_id === userId)
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    }
  },

  create: async (body: ActivityCreate): Promise<Activity> => {
    await delay()
    const matchedGame = data.games.items.find(g => g.id === body.game_id)
    const game: GameNested | null = matchedGame
      ? {
          id: matchedGame.id,
          title: matchedGame.title,
          genre: matchedGame.genre,
          platform: matchedGame.platform,
          cover_url: matchedGame.cover_url,
        }
      : null

    const activity: Activity = {
      id: crypto.randomUUID(),
      user_id: body.user_id,
      action: body.action,
      duration_minutes: body.duration_minutes ?? null,
      created_at: new Date().toISOString(),
      game,
    }
    activityStore.unshift(activity)
    return activity
  },
}

// ---------------------------------------------------------------------------
// Notifications  (mutable in-memory list)
// ---------------------------------------------------------------------------

const notificationStore: Notification[] = data.notifications.items.map(n => ({ ...n }))

export const mockNotificationsApi = {
  listByUser: async (userId: string, limit = 20, offset = 0): Promise<NotificationList> => {
    await delay()
    const filtered = notificationStore.filter(n => n.user_id === userId)
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    }
  },

  markRead: async (id: string): Promise<MarkReadResponse> => {
    await delay()
    const item = notificationStore.find(n => n.id === id)
    if (!item) throw new Error('Notification not found')
    item.read = true
    return { id, read: true }
  },
}

// ---------------------------------------------------------------------------
// Consent  (mutable in-memory Map)
// ---------------------------------------------------------------------------

const consentStore = new Map<string, ConsentRecord>()

export const mockConsentApi = {
  get: async (userId: string): Promise<ConsentRecord> => {
    await delay()
    const record = consentStore.get(userId)
    if (!record) {
      // Mirror real API behaviour: 404 when no record exists
      throw new Error('404: No consent record found')
    }
    return record
  },

  set: async (userId: string, granted: boolean): Promise<ConsentRecord> => {
    await delay()
    const record: ConsentRecord = { user_id: userId, granted, updated_at: new Date().toISOString() }
    consentStore.set(userId, record)
    return record
  },

  withdraw: async (userId: string): Promise<ConsentRecord> => {
    await delay()
    const record: ConsentRecord = { user_id: userId, granted: false, updated_at: new Date().toISOString() }
    consentStore.set(userId, record)
    return record
  },

  eraseLogs: async (userId: string): Promise<ErasureResult> => {
    await delay()
    return { user_id: userId, deleted_entries: 5 }
  },
}
