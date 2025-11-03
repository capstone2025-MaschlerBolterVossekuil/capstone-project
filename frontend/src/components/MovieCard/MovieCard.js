// ...existing code...
import React from "react"
import "./MovieCard.css"

/**
 * @typedef {import('../../../types/Movie').Movie} Movie
 */

/**
 * @param {{ movie: Movie, onClick?: (movie: Movie)=>void }} props
 */
export default function MovieCard({ movie, onClick }) {
  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : null

  return (
    <button
      type="button"
      className="movie-card"
      onClick={() => onClick && onClick(movie)}
      aria-label={`Open ${movie.Title}`}
    >
      <div className="movie-poster">
        {poster ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={poster} alt={`${movie.Title} poster`} />
        ) : (
          <div className="movie-placeholder">No Image</div>
        )}
      </div>
      <div className="movie-info">
        <h3 className="movie-title">{movie.Title}</h3>
        <div className="movie-meta">
          <span className="movie-release">{movie.Year}</span>
          <span className="movie-type">{movie.Type || ""}</span>
        </div>
      </div>
    </button>
  )
}
// ...existing code...
