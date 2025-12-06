import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import MovieCard from "../../components/MovieCard/MovieCard"
import { getWatchedMovies } from "../../lib/profileApi"

export default function MoviesWatchedTab({
  user = null,
  watchedMovies = null,
  onMovieClick = null,
  title = "Movies You've Watched",
}) {
  const [movies, setMovies] = useState(
    Array.isArray(watchedMovies) ? watchedMovies : []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    // If parent passed explicit watchedMovies, use them.
    if (Array.isArray(watchedMovies)) {
      setMovies(watchedMovies)
      return
    }

    // Otherwise, fetch from backend/supabase using user
    async function load() {
      if (!user || !user.email) {
        setMovies([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const resp = await getWatchedMovies(user)
        if (resp.error) {
          setError(resp.error)
          setMovies([])
        } else {
          setMovies(resp.movies || [])
        }
      } catch (e) {
        setError(e)
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, watchedMovies])

  if (loading) return <div>Loading watched movies…</div>
  if (error) return <div>Error loading watched movies.</div>
  if (!movies || movies.length === 0) return <div>No watched movies yet.</div>

  function handleClick(m) {
    if (onMovieClick) return onMovieClick(m)
    if (m && m.imdbID) {
      navigate(`/movie/${m.imdbID}`)
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {movies.map((m) => {
          const key = m.imdbID || m.movie_id || m.id || m.Title || m.title
          return (
            <div
              key={key}
              onClick={() => handleClick(m)}
              style={{
                cursor: onMovieClick ? "pointer" : "pointer",
              }}
            >
              <MovieCard movie={m} onClick={() => handleClick(m)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
