import { useEffect, useState } from 'react'
import { consentApi, type ConsentRecord } from '../api/consent'
import { usersApi, type User } from '../api/users'

// --- Consent Panel ---

const ConsentPanel = ({ users }: { users: User[] }) => {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (users.length > 0 && !userId) setUserId(users[0].id)
  }, [users, userId])
  const [record, setRecord] = useState<ConsentRecord | null>(null)
  const [noRecord, setNoRecord] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const clearStatus = () => {
    setRecord(null)
    setNoRecord(false)
    setError(null)
  }

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    clearStatus()
    setLoading(true)

    try {
      const data = await consentApi.get(userId.trim())
      setRecord(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      // A 404 means the user has no consent record, which is a normal state
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setNoRecord(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGrant = async () => {
    clearStatus()
    setLoading(true)
    try {
      const data = await consentApi.set(userId.trim(), true)
      setRecord(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant consent')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    clearStatus()
    setLoading(true)
    try {
      const data = await consentApi.withdraw(userId.trim())
      setRecord(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw consent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded border border-gray-700">
      <h2 className="text-lg font-semibold mb-3">Consent</h2>

      <form onSubmit={handleCheck} className="flex gap-2 mb-4">
        <select
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
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
          Check Status
        </button>
      </form>

      {noRecord && (
        <p className="text-gray-400 text-sm mb-3">
          No consent record — not granted.
        </p>
      )}

      {record && (
        <div className="mb-3 text-sm">
          <span
            className={`px-2 py-1 rounded font-medium ${record.granted ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
          >
            {record.granted ? 'Granted' : 'Not granted'}
          </span>
          <span className="text-gray-400 ml-3">
            Updated: {new Date(record.updated_at).toLocaleString()}
          </span>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleGrant}
          disabled={loading || !userId.trim()}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 text-sm"
        >
          Grant Consent
        </button>
        <button
          onClick={handleWithdraw}
          disabled={loading || !userId.trim()}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
        >
          Withdraw Consent
        </button>
      </div>
    </div>
  )
}

// --- Data Erasure Panel ---

const ErasurePanel = ({ users }: { users: User[] }) => {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (users.length > 0 && !userId) setUserId(users[0].id)
  }, [users, userId])
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEraseClick = () => {
    if (!userId.trim()) return
    setSuccess(null)
    setError(null)

    if (!confirming) {
      // First click: ask for confirmation
      setConfirming(true)
      return
    }

    // Second click: confirmed — proceed with erasure
    setConfirming(false)
    setLoading(true)

    consentApi.eraseLogs(userId.trim())
      .then(result => {
        setSuccess(`Deleted ${result.deleted_entries} log entries.`)
        setUserId('')
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erasure failed')
      })
      .finally(() => setLoading(false))
  }

  const handleUserIdChange = (value: string) => {
    setUserId(value)
    // Reset confirmation if the user changes the ID mid-flow
    setConfirming(false)
  }

  return (
    <div className="p-4 bg-gray-800 rounded border border-gray-700">
      <h2 className="text-lg font-semibold mb-1">Data Erasure</h2>
      <p className="text-yellow-400 text-sm mb-4">
        This permanently deletes all log entries for this user. This cannot be undone.
      </p>

      <div className="flex gap-2 mb-4">
        <select
          value={userId}
          onChange={e => handleUserIdChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          {users.length === 0 && <option value="">No users</option>}
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
      </div>

      {confirming && (
        <p className="text-red-400 text-sm mb-3 font-medium">
          Are you sure? Click again to confirm.
        </p>
      )}

      <button
        onClick={handleEraseClick}
        disabled={loading || !userId.trim()}
        className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
      >
        {loading ? 'Erasing…' : confirming ? 'Confirm — Erase All Logs' : 'Erase All Logs'}
      </button>

      {success && (
        <p className="mt-3 bg-green-900 text-green-300 p-3 rounded text-sm">{success}</p>
      )}
      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}

// --- Page ---

const GdprPage = () => {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    usersApi.list(100).then(data => setUsers(data.items)).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">GDPR</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConsentPanel users={users} />
        <ErasurePanel users={users} />
      </div>
    </div>
  )
}

export default GdprPage
