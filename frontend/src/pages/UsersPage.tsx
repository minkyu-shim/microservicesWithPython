import { useEffect, useState } from 'react'
import { usersApi, type User } from '../api/users'
import CreateUserForm from '../components/CreateUserForm'

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi.list()
      .then(data => { setUsers(data.items); setTotal(data.total) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (user: User) => {
    setUsers(prev => [user, ...prev])
    setTotal(prev => prev + 1)
  }

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error) return <p className="text-red-400">Error: {error}</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Users <span className="text-gray-500 text-sm">({total})</span>
      </h1>

      <CreateUserForm onCreated={handleCreated} />

      {users.length === 0 ? (
        <p className="text-gray-400">No users yet.</p>
      ) : (
        <ul className="space-y-2">
          {users.map(u => (
            <li key={u.id} className="p-3 bg-gray-800 rounded">
              <span className="font-medium">{u.username}</span>
              <span className="text-gray-400 ml-3 text-sm">{u.email}</span>
              <span className={`ml-3 text-xs px-2 py-0.5 rounded ${u.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                {u.is_active ? 'active' : 'inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UsersPage
