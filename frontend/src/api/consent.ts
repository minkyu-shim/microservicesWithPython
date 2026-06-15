import { api } from './client'
import { mockConsentApi } from './mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface ConsentRecord {
  user_id: string
  granted: boolean
  updated_at: string
}

export interface ErasureResult {
  user_id: string
  deleted_entries: number
}

export const consentApi = USE_MOCK ? mockConsentApi : {
  get: (userId: string): Promise<ConsentRecord> =>
    api.get<ConsentRecord>(`/v1/logging/consent/${userId}`),

  set: (userId: string, granted: boolean): Promise<ConsentRecord> =>
    api.post<ConsentRecord>(`/v1/logging/consent/${userId}`, { granted }),

  withdraw: (userId: string): Promise<ConsentRecord> =>
    api.delete<ConsentRecord>(`/v1/logging/consent/${userId}`),

  eraseLogs: (userId: string): Promise<ErasureResult> =>
    api.delete<ErasureResult>(`/v1/logging/logs/${userId}`),
}
