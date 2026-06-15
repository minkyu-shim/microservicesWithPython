import { useEffect, useState } from 'react'
import { gamesApi, type Game } from '../api/games'
import CreateGameForm from '../components/CreateGameForm'

const GamesPage = () => {
  const [games, setGames] = useState<Game[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchGames = (q: string) => {
    setLoading(true)
    setError(null)
    const call = q.trim() ? gamesApi.search(q) : gamesApi.list()
    call
      .then(data => { setGames(data.items); setTotal(data.total) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGames('') }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchGames(query)
  }

  const handleCreated = (game: Game) => {
    setGames(prev => [game, ...prev])
    setTotal(prev => prev + 1)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Games <span className="text-gray-500 text-sm">({total})</span>
      </h1>

      <CreateGameForm onCreated={handleCreated} />

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title…"
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); fetchGames('') }}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Clear
          </button>
        )}
      </form>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}
      {!loading && !error && games.length === 0 && <p className="text-gray-400">No games found.</p>}
      {!loading && !error && games.length > 0 && (
        <ul className="space-y-2">
          {games.map(g => (
            <li key={g.id} className="p-3 bg-gray-800 rounded flex items-center gap-4">
              {g.cover_url && (
                <img src={g.cover_url} alt={g.title} className="w-10 h-10 object-cover rounded" />
              )}
              <div>
                <span className="font-medium">{g.title}</span>
                <span className="text-gray-400 ml-3 text-sm">{g.genre} · {g.platform}</span>
                {g.release_year && (
                  <span className="text-gray-500 ml-2 text-sm">{g.release_year}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GamesPage
