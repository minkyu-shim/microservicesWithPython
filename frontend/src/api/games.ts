import { api } from './client'
import { mockGamesApi } from './mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface Game {
  id: string
  title: string
  genre: string
  platform: string
  release_year: number | null
  cover_url: string | null
  created_at: string
}

export interface GameSummary {
  id: string
  title: string
  genre: string
  platform: string
}

export interface GameList {
  items: Game[]
  total: number
  limit: number
  offset: number
}

export interface GameCreate {
  title: string
  genre: string
  platform: string
  release_year?: number
  cover_url?: string
}

export const gamesApi = USE_MOCK ? mockGamesApi : {
  list: (limit = 20, offset = 0) =>
    api.get<GameList>(`/v1/games?limit=${limit}&offset=${offset}`),

  get: (id: string) =>
    api.get<Game>(`/v1/games/${id}`),

  search: (q: string, limit = 20, offset = 0) =>
    api.get<GameList>(`/v1/games/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),

  create: (data: GameCreate) =>
    api.post<Game>('/v1/games', data),

  summary: (id: string) =>
    api.get<GameSummary>(`/v1/games/${id}/summary`),
}
