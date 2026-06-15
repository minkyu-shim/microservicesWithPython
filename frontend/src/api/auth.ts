import { api } from './client'
import { mockAuthApi } from './mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface MeResponse {
  sub: string
  role: string
  exp: number
}

export const authApi = USE_MOCK ? mockAuthApi : {
  login: (username: string, password: string): Promise<TokenResponse> => {
    const params = new URLSearchParams({ username, password })
    return api.postForm<TokenResponse>('/v1/auth/token', params)
  },

  me: (): Promise<MeResponse> =>
    api.get<MeResponse>('/v1/auth/me'),
}
