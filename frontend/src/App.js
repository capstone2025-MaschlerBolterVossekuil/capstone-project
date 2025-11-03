// ...existing code...
import React, { useEffect, useState } from "react"
import MovieCard from "./components/MovieCard/MovieCard"
import MoviePage from "./pages/MoviePage"

/**
 * @typedef {import('../types/Movie').Movie} Movie
 */

/*
  Usage:
  - Set your OMDb API key in an env var REACT_APP_OMDB_API_KEY or replace `process.env.REACT_APP_OMDB_API_KEY` below.
    Example .env (create in frontend/): REACT_APP_OMDB_API_KEY=your_key_here
*/

const API_KEY = "d86bc547"

export default function App() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState(/** @type {Movie[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(/** @type {Movie|null} */ (null))

  useEffect(() => {
    performSearch(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (selected) {
    return <MoviePage movie={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Movies</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          performSearch(query)
        }}
        style={{ marginBottom: 16, display: "flex", gap: 8 }}
      >
        <input
          aria-label="Search movies"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search OMDb..."
          style={{ flex: 1, padding: "8px 10px", fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>
          Search
        </button>
      </form>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {results.map((m) => (
          <MovieCard
            key={m.imdbID}
            movie={m}
            onClick={() => {
              openMovie(m.imdbID)
            }}
          />
        ))}
      </div>

      {results.length === 0 && !loading && !error && (
        <div style={{ marginTop: 20, color: "#666" }}>No results</div>
      )}
    </div>
  )
}
// ...existing code...
