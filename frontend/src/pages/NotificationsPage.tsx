import { useEffect, useState } from 'react'
import { notificationsApi, type Notification } from '../api/notifications'
import { usersApi, type User } from '../api/users'

const NotificationsPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    usersApi.list(100).then(data => {
      setUsers(data.items)
      if (data.items.length > 0) setUserId(data.items[0].id)
    }).catch(() => {})
  }, [])

  const loadNotifications = async (id: string) => {
    if (!id) return
    setLoading(true)
    setError(null)
    setLoaded(false)
    try {
      const data = await notificationsApi.listByUser(id)
      setNotifications(data.items)
      setTotal(data.total)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault()
    loadNotifications(userId)
  }

  const handleUserChange = (id: string) => {
    setUserId(id)
    setLoaded(false)
    setNotifications([])
    setError(null)
  }

  const handleMarkRead = async (id: string) => {
    // Flip state optimistically so the UI feels instant, then call the API
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )

    try {
      await notificationsApi.markRead(id)
    } catch {
      // Roll back on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: false } : n))
      )
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      <form onSubmit={handleLoad} className="flex gap-2 mb-6">
        <select
          value={userId}
          onChange={e => handleUserChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          {users.length === 0 && <option value="">No users</option>}
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !userId}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loaded && (
        <>
          <p className="text-gray-500 text-sm mb-3">
            {total} notification{total !== 1 ? 's' : ''} for this user
          </p>

          {notifications.length === 0 ? (
            <p className="text-gray-400">No notifications found.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className="p-3 bg-gray-800 rounded flex items-center gap-3"
                >
                  {/* Unread indicator: green dot */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-600' : 'bg-green-400'}`}
                    title={n.read ? 'Read' : 'Unread'}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.message}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 mt-1 inline-block">
                      {n.type}
                    </span>
                  </div>

                  <time className="text-gray-500 text-xs flex-shrink-0">
                    {new Date(n.created_at).toLocaleString()}
                  </time>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default NotificationsPage
