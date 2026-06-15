import { api } from './client'
import { mockNotificationsApi } from './mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface Notification {
  id: string
  user_id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export interface NotificationList {
  items: Notification[]
  total: number
  limit: number
  offset: number
}

export interface MarkReadResponse {
  id: string
  read: true
}

export const notificationsApi = USE_MOCK ? mockNotificationsApi : {
  listByUser: async (userId: string, limit = 20, offset = 0): Promise<NotificationList> => {
    // The notification-service may return a raw array rather than the paginated envelope.
    // Normalise both shapes so callers always receive a consistent object.
    const data = await api.get<NotificationList | Notification[]>(
      `/v1/notifications/${userId}?limit=${limit}&offset=${offset}`
    )
    if (Array.isArray(data)) {
      return { items: data, total: data.length, limit, offset }
    }
    return data
  },

  markRead: (notificationId: string) =>
    api.patch<MarkReadResponse>(`/v1/notifications/${notificationId}/read`, {}),
}
