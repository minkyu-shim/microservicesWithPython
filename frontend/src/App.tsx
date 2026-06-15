import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'
import GamesPage from './pages/GamesPage'
import ActivitiesPage from './pages/ActivitiesPage'
import NotificationsPage from './pages/NotificationsPage'
import GdprPage from './pages/GdprPage'

const NavBar = () => {
  const { me, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="p-4 flex items-center gap-6 border-b border-gray-800">
      <div className="flex gap-6 flex-1">
        <Link to="/users" className="hover:text-blue-400">Users</Link>
        <Link to="/games" className="hover:text-blue-400">Games</Link>
        <Link to="/activities" className="hover:text-blue-400">Activities</Link>
        <Link to="/notifications" className="hover:text-blue-400">Notifications</Link>
        <Link to="/gdpr" className="hover:text-blue-400">GDPR</Link>
      </div>
      <div className="flex items-center gap-4">
        {me && (
          <span className="text-gray-400 text-sm">{me.sub}</span>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
        >
          Log out
        </button>
      </div>
    </nav>
  )
}

const App = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <>
                <NavBar />
                <main className="p-6">
                  <Routes>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/activities" element={<ActivitiesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/gdpr" element={<GdprPage />} />
                    <Route path="/" element={<Navigate to="/users" replace />} />
                    <Route path="*" element={<p className="text-gray-400">Select a section above.</p>} />
                  </Routes>
                </main>
              </>
            }
          />
        </Route>
      </Routes>
    </div>
  )
}

export default App
