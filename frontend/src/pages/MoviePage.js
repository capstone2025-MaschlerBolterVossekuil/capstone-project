// ...existing code...
import React from "react"

/**
 * @typedef {import('../../types/Movie').Movie} Movie
 */

/**
 * @param {{ movie: Movie|null, onBack?: ()=>void }} props
 */
export default function MoviePage({ movie, onBack }) {
  if (!movie) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack}>Back</button>
        <p>No movie selected.</p>
      </div>
    )
  }

  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : null

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>
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
