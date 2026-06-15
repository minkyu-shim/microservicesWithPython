import { useState } from 'react'
import { usersApi, type User } from '../api/users'

interface Props {
  onCreated: (user: User) => void
}

const CreateUserForm = ({ onCreated }: Props) => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const user = await usersApi.create({ username, email, password })
      setSuccess(`User "${user.username}" created.`)
      setUsername('')
      setEmail('')
      setPassword('')
      onCreated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
      <h2 className="text-lg font-semibold mb-3">Create User</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-username" className="text-xs text-gray-400">Username</label>
          <input
            id="new-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="new-email" className="text-xs text-gray-400">Email</label>
          <input
            id="new-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="new-password" className="text-xs text-gray-400">Password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>

      {success && (
        <p className="mt-3 bg-green-900 text-green-300 p-3 rounded text-sm">{success}</p>
      )}
      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}

export default CreateUserForm
