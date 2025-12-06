import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import MovieCard from "../MovieCard/MovieCard"
import "./RecommendedFeed.css"
import { supabase } from "../../lib/supabaseClient"
import { searchByKeyword, fetchById, hasApiKey } from "../../lib/omdbApi"

const DEFAULT_GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Romance",
  "Horror",
  "Thriller",
  "Family",
  "Animation",
  "Documentary",
]

// Popular search terms that work better with OMDB
const GENRE_SEARCH_TERMS = {
  Action: ["action", "adventure", "fight", "hero"],
  Comedy: ["comedy", "funny", "laugh"],
  Drama: ["drama", "story"],
  "Sci-Fi": ["space", "future", "alien", "robot"],
  Romance: ["love", "romance", "romantic"],
  Horror: ["horror", "scary", "zombie"],
  Thriller: ["thriller", "suspense", "mystery"],
  Family: ["family", "kids", "children"],
  Animation: ["animation", "animated", "cartoon"],
  Documentary: ["documentary", "true", "history"],
}

export default function RecommendedFeed({ user }) {
  const [genres, setGenres] = useState(DEFAULT_GENRES)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentGenreIndex, setCurrentGenreIndex] = useState(0)

  useEffect(() => {
    let mounted = true

    async function loadPrefs() {
      if (!user || !user.email) {
        setGenres(DEFAULT_GENRES)
        return
      }
      try {
        const { data: users, error: userFindErr } = await supabase
          .from("user_info")
          .select("id")
          .eq("email", user.email)
          .limit(1)

        if (userFindErr) return setGenres(DEFAULT_GENRES)
        const userRow = Array.isArray(users) ? users[0] : users
        if (!userRow || !userRow.id) return setGenres(DEFAULT_GENRES)

        const { data: prefs, error: prefsErr } = await supabase
          .from("movie_preferences")
          .select("preferences")
          .eq("user_id", userRow.id)
          .limit(1)

        if (prefsErr) return setGenres(DEFAULT_GENRES)
        const prefRow = Array.isArray(prefs) ? prefs[0] : prefs
        if (!prefRow || prefRow.preferences == null)
          return setGenres(DEFAULT_GENRES)

        let parsed = prefRow.preferences
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed)
          } catch (e) {
            parsed = DEFAULT_GENRES
          }
        }
        const arr =
          Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_GENRES
        if (mounted) setGenres(arr)
      } catch (e) {
        setGenres(DEFAULT_GENRES)
      }
    }

    loadPrefs()
    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    let cancelled = false

    async function loadRecs() {
      if (genres.length === 0) return

      // If OMDb API key is not configured, avoid making requests and show a helpful message.
      if (!hasApiKey()) {
        setError(
          "OMDb API key not configured. Set `REACT_APP_OMDB_API_KEY` in `frontend/.env` to enable recommendations."
        )
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const targetCount = 15
        const collected = []
        const seen = new Set()

        // Rotate through genres to get variety
        const genreQueue = [...genres]
        let attempts = 0
        const maxAttempts = genres.length * 3 // Limit total API calls

        while (collected.length < targetCount && attempts < maxAttempts) {
          attempts++

          // Get next genre
          const genre = genreQueue[attempts % genreQueue.length]
          const searchTerms = GENRE_SEARCH_TERMS[genre] || [genre.toLowerCase()]
          const searchTerm =
            searchTerms[Math.floor(Math.random() * searchTerms.length)]

          try {
            // Search with a random page to get variety
            const randomPage = Math.floor(Math.random() * 3) + 1
            const res = await searchByKeyword(searchTerm, randomPage)

            if (res && res.Search && Array.isArray(res.Search)) {
              // Take first few unseen results
              for (let movie of res.Search.slice(0, 3)) {
                if (collected.length >= targetCount) break
                if (!movie.imdbID || seen.has(movie.imdbID)) continue

                try {
                  const detail = await fetchById(movie.imdbID)

                  if (!detail || detail.Response === "False") continue

                  // Check if movie matches any of the user's preferred genres
                  const movieGenres = detail.Genre
                    ? detail.Genre.toLowerCase()
                    : ""
                  const matchesPreference = genres.some((g) =>
                    movieGenres.includes(g.toLowerCase())
                  )

                  if (matchesPreference) {
                    seen.add(movie.imdbID)
                    collected.push(detail)
                  }
                } catch (e) {
                  // Skip this movie and continue
                  console.warn("Error fetching movie details:", e)
                }

                // Small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 100))
              }
            }
          } catch (e) {
            console.warn(`Error searching for ${searchTerm}:`, e)
          }
        }

        if (!cancelled) {
          setMovies(collected)
          if (collected.length === 0) {
            setError(
              "No movies found matching your preferences. Try adjusting your genre preferences."
            )
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || String(e))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRecs()
    return () => {
      cancelled = true
    }
  }, [genres])

  const loadMore = () => {
    setCurrentGenreIndex((prev) => (prev + 1) % genres.length)
  }

  const refresh = () => {
    // Force a reload by updating a key dependency
    setMovies([])
    setCurrentGenreIndex(0)
  }

  return (
    <div className="recommended-feed">
      <div className="recommended-header">
        <h2 style={{ margin: 0 }}>Recommended For You</h2>
        <div className="recommended-controls">
          <div className="recommended-note">Based on: {genres.join(", ")}</div>
          <div>
            <button onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && <div>Loading recommendations…</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div className="recommended-grid">
        {movies.map((m) => (
          <Link
            key={m.imdbID}
            to={`/movie/${m.imdbID}`}
            style={{ textDecoration: "none" }}
          >
            <MovieCard movie={m} />
          </Link>
        ))}
      </div>

      {movies.length === 0 && !loading && !error && (
        <div style={{ marginTop: 12, color: "#666" }}>
          No recommendations available. Try updating your genre preferences.
        </div>
      )}
    </div>
  )
}
