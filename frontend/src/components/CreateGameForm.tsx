import { useState } from 'react'
import { gamesApi, type Game } from '../api/games'

interface Props {
  onCreated: (game: Game) => void
}

const CreateGameForm = ({ onCreated }: Props) => {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [platform, setPlatform] = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const game = await gamesApi.create({
        title,
        genre,
        platform,
        release_year: releaseYear ? parseInt(releaseYear, 10) : undefined,
        cover_url: coverUrl || undefined,
      })
      setSuccess(`Game "${game.title}" created.`)
      setTitle('')
      setGenre('')
      setPlatform('')
      setReleaseYear('')
      setCoverUrl('')
      onCreated(game)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
      <h2 className="text-lg font-semibold mb-3">Add Game</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="game-title" className="text-xs text-gray-400">Title *</label>
          <input
            id="game-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="game-genre" className="text-xs text-gray-400">Genre *</label>
          <input
            id="game-genre"
            type="text"
            value={genre}
            onChange={e => setGenre(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="game-platform" className="text-xs text-gray-400">Platform *</label>
          <input
            id="game-platform"
            type="text"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            required
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="game-year" className="text-xs text-gray-400">Release year</label>
          <input
            id="game-year"
            type="number"
            value={releaseYear}
            onChange={e => setReleaseYear(e.target.value)}
            min="1970"
            max="2099"
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-28"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="game-cover" className="text-xs text-gray-400">Cover URL</label>
          <input
            id="game-cover"
            type="url"
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding…' : 'Add Game'}
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

export default CreateGameForm
