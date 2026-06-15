import { api } from './client'
import { mockActivitiesApi } from './mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface GameNested {
  id: string
  title: string
  genre: string
  platform: string
  cover_url: string | null
}

export interface Activity {
  id: string
  user_id: string
  action: string
  duration_minutes: number | null
  created_at: string
  game: GameNested | null
}

export interface ActivityList {
  items: Activity[]
  total: number
  limit: number
  offset: number
}

export interface ActivityCreate {
  user_id: string
  game_id: string
  action: 'played' | 'completed' | 'reviewed' | 'wishlist_added'
  duration_minutes?: number
}

export const activitiesApi = USE_MOCK ? mockActivitiesApi : {
  list: (limit = 20, offset = 0) =>
    api.get<ActivityList>(`/v1/activities?limit=${limit}&offset=${offset}`),

  listByUser: (userId: string, limit = 20, offset = 0) =>
    api.get<ActivityList>(`/v1/activities/user/${userId}?limit=${limit}&offset=${offset}`),

  create: (data: ActivityCreate) =>
    api.post<Activity>('/v1/activities', data),
}
