// ...existing code...
import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { addMovieToWatched, isMovieWatched } from "../lib/profileApi"
import { supabase } from "../lib/supabaseClient"

/**
 * @typedef {import('../../types/Movie').Movie} Movie
 */

/**
 * @param {{ movie: Movie|null, onBack?: ()=>void }} props
 */
export default function MoviePage({ movie: initialMovie, onBack }) {
  const { imdbID } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(initialMovie || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState("")
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (initialMovie) return
      if (!imdbID) return
      setLoading(true)
      setError(null)
      try {
        const key = process.env.REACT_APP_OMDB_API_KEY || "d86bc547"
        const url = `https://www.omdbapi.com/?apikey=${key}&i=${imdbID}&plot=full`
        const res = await fetch(url)
        const data = await res.json()
        if (!mounted) return
        if (data && data.Response === "True") setMovie(data)
        else setError(data?.Error || "Could not load movie")
      } catch (err) {
        if (!mounted) return
        setError(err.message || "Fetch error")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [imdbID, initialMovie])

  // Check whether this movie is already watched by the current user
  useEffect(() => {
    let mounted = true
    async function checkWatched() {
      if (!movie) return
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (mounted) setWatched(false)
          return
        }

        const resp = await isMovieWatched(
          { email: user.email },
          { imdbID: movie.imdbID }
        )
        if (!mounted) return
        if (resp && resp.error) {
          console.warn("isMovieWatched error:", resp.error)
          setWatched(false)
        } else {
          setWatched(Boolean(resp && resp.watched))
        }
      } catch (e) {
        if (!mounted) return
        console.warn("Error checking watched status:", e)
        setWatched(false)
      }
    }
    checkWatched()
    return () => {
      mounted = false
    }
  }, [movie])

  const goBack = onBack || (() => navigate(-1))

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>
  if (error)
    return (
      <div style={{ padding: 20 }}>
        <button onClick={goBack}>Back</button>
        <div style={{ color: "red" }}>{error}</div>
      </div>
    )

  if (!movie) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={goBack}>Back</button>
        <p>No movie selected.</p>
      </div>
    )
  }

  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : null

  async function handleAddWatched() {
    setAdding(true)
    setAddMessage("")
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setAddMessage("You must be signed in to add a watched movie.")
        return
      }

      const res = await addMovieToWatched(movie, { email: user.email })
      if (res.error) {
        console.warn("addMovieToWatched error:", res.error)
        setAddMessage("Failed to add movie to watched list")
      } else {
        setAddMessage("Added to watched")
        setWatched(true)
      }
    } catch (err) {
      console.warn("Error adding watched movie:", err)
      setAddMessage((err && err.message) || "Error")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={goBack} style={{ marginBottom: 12 }}>
        Back
      </button>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 300, flex: "0 0 300px" }}>
          {poster ? (
            <img
              src={poster}
              alt={`${movie.Title} poster`}
              style={{ width: "100%", borderRadius: 8 }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 450,
                background: "#eee",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              No Image
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ marginTop: 0 }}>
            {movie.Title} {movie.Year ? `(${movie.Year})` : ""}
          </h1>
          <div style={{ marginTop: 8 }}>
            {watched ? (
              <button disabled style={{ background: "#e5e7eb", color: "#111" }}>
                Watched
              </button>
            ) : (
              <button onClick={handleAddWatched} disabled={adding}>
                {adding ? "Adding…" : "Add to Watched"}
              </button>
            )}
            {addMessage && (
              <span style={{ marginLeft: 12, color: "#2563eb" }}>
                {addMessage}
              </span>
            )}
          </div>
          <p style={{ color: "#666", marginTop: 4 }}>
            {movie.Released || movie.Runtime
              ? `${movie.Released || ""} ${
                  movie.Runtime ? `• ${movie.Runtime}` : ""
                }`
              : ""}
            {movie.Language ? ` • ${movie.Language}` : ""}
          </p>

          {movie.Plot && <p style={{ marginTop: 16 }}>{movie.Plot}</p>}

          {movie.Genre && (
            <div style={{ marginTop: 12 }}>
              <strong>Genres:</strong> {movie.Genre}
            </div>
          )}

          {movie.Director && (
            <div style={{ marginTop: 8 }}>
              <strong>Director:</strong> {movie.Director}
            </div>
          )}

          {movie.Actors && (
            <div style={{ marginTop: 8 }}>
              <strong>Actors:</strong> {movie.Actors}
            </div>
          )}

          <div style={{ marginTop: 12, color: "#444" }}>
            {movie.imdbRating && (
              <div>
                <strong>IMDB Rating:</strong> {movie.imdbRating} / 10
              </div>
            )}
            {movie.imdbVotes && (
              <div>
                <strong>IMDB Votes:</strong> {movie.imdbVotes}
              </div>
            )}
            {movie.BoxOffice && (
              <div>
                <strong>Box Office:</strong> {movie.BoxOffice}
              </div>
            )}
            {movie.Production && (
              <div>
                <strong>Production:</strong> {movie.Production}
              </div>
            )}
          </div>

          {movie.Ratings && movie.Ratings.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Other Ratings:</strong>
              <ul>
                {movie.Ratings.map((r) => (
                  <li key={r.Source}>
                    {r.Source}: {r.Value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// ...existing code...
