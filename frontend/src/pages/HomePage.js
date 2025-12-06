import React from "react"
import MovieCard from "../components/MovieCard/MovieCard"
import RecommendedFeed from "../components/RecommendedFeed/RecommendedFeed"
import { Link } from "react-router-dom"

/**
 * HomePage
 * Props:
 * - user: { email }
 * - onSignOut: () => void
 * - query, setQuery, performSearch, loading, error, results, openMovie
 */
export default function HomePage({
  user,
  onSignOut,
  onOpenAccountSettings,
  query,
  setQuery,
  performSearch,
  loading,
  error,
  results,
  openMovie,
}) {
  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ marginTop: 0 }}>Movies</h1>
        <div>
          <Link to="/settings" style={{ marginRight: 12 }}>
            Account Settings
          </Link>
          <span style={{ marginRight: 12 }}>{user.email}</span>
          <button onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          performSearch(query)
        }}
        style={{ marginBottom: 16, display: "flex", gap: 8 }}
      >
        <button
          type="button"
          onClick={() => {
            setQuery("")
            performSearch("")
          }}
          style={{ padding: "8px 12px" }}
        >
          Home
        </button>
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
      {query === "" && <RecommendedFeed user={user} />}

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from(new Map(results.map((r) => [r.imdbID, r])).values()).map(
          (m) => (
            <Link
              key={m.imdbID}
              to={`/movie/${m.imdbID}`}
              style={{ textDecoration: "none" }}
            >
              <MovieCard movie={m} />
            </Link>
          )
        )}
      </div>

      {results.length === 0 && !loading && !error && (
        <div style={{ marginTop: 20, color: "#666" }}>No results</div>
      )}
    </div>
  )
}
