import { useEffect, useState } from 'react'
import { activitiesApi, type Activity, type ActivityCreate } from '../api/activities'
import { usersApi, type User } from '../api/users'
import { gamesApi, type Game } from '../api/games'

const ACTION_COLORS: Record<string, string> = {
  played: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  reviewed: 'bg-purple-900 text-purple-300',
  wishlist_added: 'bg-yellow-900 text-yellow-300',
}

const actionBadgeClass = (action: string): string =>
  ACTION_COLORS[action] ?? 'bg-gray-700 text-gray-300'

const ACTION_OPTIONS: ActivityCreate['action'][] = [
  'played',
  'completed',
  'reviewed',
  'wishlist_added',
]

const ActivitiesPage = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [users, setUsers] = useState<User[]>([])
  const [games, setGames] = useState<Game[]>([])

  // Log Activity form state
  const [userId, setUserId] = useState('')
  const [gameId, setGameId] = useState('')
  const [action, setAction] = useState<ActivityCreate['action']>('played')
  const [duration, setDuration] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    activitiesApi.list()
      .then(data => { setActivities(data.items); setTotal(data.total) })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
    usersApi.list(100).then(data => {
      setUsers(data.items)
      if (data.items.length > 0) setUserId(data.items[0].id)
    }).catch(() => {})
    gamesApi.list(100).then(data => {
      setGames(data.items)
      if (data.items.length > 0) setGameId(data.items[0].id)
    }).catch(() => {})
  }, [])

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)

    try {
      const created = await activitiesApi.create({
        user_id: userId,
        game_id: gameId,
        action,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
      })
      setActivities(prev => [created, ...prev])
      setTotal(prev => prev + 1)
      setFormSuccess(`Activity logged: ${action}`)
      setUserId('')
      setGameId('')
      setAction('played')
      setDuration('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to log activity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Activities <span className="text-gray-500 text-sm">({total})</span>
      </h1>

      {/* Log Activity Form */}
      <div className="mb-8 p-4 bg-gray-800 rounded border border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Log Activity</h2>

        <form onSubmit={handleLogActivity} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="act-user-id" className="text-xs text-gray-400">User</label>
            <select
              id="act-user-id"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-48"
            >
              {users.length === 0 && <option value="">No users</option>}
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="act-game-id" className="text-xs text-gray-400">Game</label>
            <select
              id="act-game-id"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
              className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-48"
            >
              {games.length === 0 && <option value="">No games</option>}
              {games.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="act-action" className="text-xs text-gray-400">Action</label>
            <select
              id="act-action"
              value={action}
              onChange={e => setAction(e.target.value as ActivityCreate['action'])}
              className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="act-duration" className="text-xs text-gray-400">Duration (minutes)</label>
            <input
              id="act-duration"
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min="1"
              className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-28"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Logging…' : 'Log Activity'}
          </button>
        </form>

        {formSuccess && (
          <p className="mt-3 bg-green-900 text-green-300 p-3 rounded text-sm">{formSuccess}</p>
        )}
        {formError && (
          <p className="mt-3 text-red-400 text-sm">{formError}</p>
        )}
      </div>

      {/* Global Feed */}
      <h2 className="text-lg font-semibold mb-3">Global Feed</h2>

      {loading && <p className="text-gray-400">Loading…</p>}
      {loadError && <p className="text-red-400">Error: {loadError}</p>}
      {!loading && !loadError && activities.length === 0 && (
        <p className="text-gray-400">No activities yet.</p>
      )}
      {!loading && !loadError && activities.length > 0 && (
        <ul className="space-y-2">
          {activities.map(a => (
            <li key={a.id} className="p-3 bg-gray-800 rounded flex items-center gap-4">
              {a.game?.cover_url && (
                <img
                  src={a.game.cover_url}
                  alt={a.game.title}
                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{a.game?.title ?? 'Unknown game'}</span>
                <span
                  className={`ml-3 text-xs px-2 py-0.5 rounded ${actionBadgeClass(a.action)}`}
                >
                  {a.action}
                </span>
                {a.duration_minutes != null && (
                  <span className="text-gray-400 ml-3 text-sm">{a.duration_minutes} min</span>
                )}
              </div>
              <time className="text-gray-500 text-xs flex-shrink-0">
                {new Date(a.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ActivitiesPage
