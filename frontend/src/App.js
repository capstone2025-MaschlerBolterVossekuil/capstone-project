import React, { useEffect, useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom"
import { supabase } from "./lib/supabaseClient"
import MoviePage from "./pages/MoviePage"
import AccountSettings from "./pages/AccountSettings/AccountSettings"
import HomePage from "./pages/HomePage"
import LoginForm from "./components/LoginForm/LoginForm"

/**
 * @typedef {import('../types/Movie').Movie} Movie
 */

/*
  Usage:
  - Set your OMDb API key in an env var REACT_APP_OMDB_API_KEY or replace `process.env.REACT_APP_OMDB_API_KEY` below.
    Example .env (create in frontend/): REACT_APP_OMDB_API_KEY=your_key_here
*/

const API_KEY = process.env.REACT_APP_OMDB_API_KEY || ""

export default function App() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState(/** @type {Movie[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(/** @type {Movie|null} */ (null))

  const [user, setUser] = useState(null)

  useEffect(() => {
    if (user) {
      performSearch(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // try to restore session on mount
  useEffect(() => {
    let mounted = true
    async function restore() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!mounted) return
        if (session && session.user) setUser(session.user)
      } catch (e) {
        // ignore
      }
    }
    restore()
    return () => {
      mounted = false
    }
  }, [])

  async function performSearch(q) {
    if (!q) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(
        q
      )}&type=movie`
      const res = await fetch(url)
      const data = await res.json()
      if (data.Response === "True" && Array.isArray(data.Search)) {
        setResults(data.Search)
      } else {
        setResults([])
        setError(data.Error || "No results")
      }
    } catch (err) {
      setError(err.message || "Fetch error")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function openMovie(imdbID) {
    if (!imdbID) return
    setLoading(true)
    setError(null)
    try {
      const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}&plot=full`
      const res = await fetch(url)
      const data = await res.json()
      if (data.Response === "True") {
        setSelected(data)
      } else {
        setError(data.Error || "Could not load movie")
      }
    } catch (err) {
      setError(err.message || "Fetch error")
    } finally {
      setLoading(false)
    }
  }

  // Top-level Login page component (stable identity)
  function LoginPage({ setUser }) {
    const navigate = useNavigate()
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: "40px auto" }}>
        <h1 style={{ marginTop: 0, textAlign: "center" }}>Sign In</h1>
        <LoginForm
          onLogin={(user) => {
            setUser(user)
            navigate("/", { replace: true })
          }}
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route
          path="/"
          element={
            user ? (
              <HomePage
                user={user}
                onSignOut={async () => {
                  try {
                    await supabase.auth.signOut()
                  } catch (e) {
                    console.warn("Sign out failed", e)
                  }
                  setUser(null)
                }}
                query={query}
                setQuery={setQuery}
                performSearch={performSearch}
                loading={loading}
                error={error}
                results={results}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/movie/:imdbID"
          element={user ? <MoviePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={
            user ? (
              <AccountSettings
                user={user}
                initialPreferences={[]}
                initialWatchedIds={[]}
                onSave={(payload) => {
                  console.info("AccountSettings save:", payload)
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
// ...existing code...
