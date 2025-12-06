import { supabase } from "./supabaseClient"

export async function saveProfileAndPreferences({
  email,
  first_name,
  last_name,
}) {
  if (!email) return { error: new Error("email required") }

  // Insert into user_info
  const { data: userData, error: userError } = await supabase
    .from("user_info")
    .insert([
      {
        user_name: email,
        first_name: first_name || null,
        last_name: last_name || null,
        email,
      },
    ])
    .select("id")
    .limit(1)

  if (userError) return { error: userError }

  const createdUser = Array.isArray(userData) ? userData[0] : userData
  if (!createdUser || !createdUser.id)
    return { error: new Error("Could not create user_info row") }

  // Insert a movie_preferences row for the created user (if not exists)
  const { data: prefData, error: prefError } = await supabase
    .from("movie_preferences")
    .upsert(
      [
        {
          user_id: createdUser.id,
          child_account: false,
          movies_watched_id: null,
          preferences: JSON.stringify({}),
        },
      ],
      { onConflict: "user_id" }
    )
    .select()

  if (prefError) return { userInfo: createdUser, error: prefError }

  return { userInfo: createdUser, moviePreferences: prefData }
}

/**
 * Add a movie to the user's watched list.
 * - Finds or upserts a movie in `movies` (best-effort by title+released)
 * - Prevents duplicate `user_watched_movies` entries
 * - Inserts into `user_watched_movies`
 *
 * @param {object} movie OMDb movie object (expects Title, Released, Plot, Year, imdbID optional)
 * @param {object} user Object with at least `email` property
 */
export async function addMovieToWatched(movie, user) {
  if (!movie || !user || !user.email)
    return { error: new Error("movie and user.email required") }

  // Find user_info row for this email
  const { data: users, error: userFindError } = await supabase
    .from("user_info")
    .select("id")
    .eq("email", user.email)
    .limit(1)

  if (userFindError) return { error: userFindError }
  const userRow = Array.isArray(users) ? users[0] : users
  if (!userRow || !userRow.id)
    return { error: new Error("user_info row not found for this user") }

  // Determine movie identity
  const title = movie.Title || movie.title || "Unknown"
  const released = movie.Released || movie.released || null
  const description = movie.Plot || movie.plot || null
  const imdbID = movie.imdbID || movie.imdbId || movie.imdb_id || null

  // Try to find existing movie by imdbID if available, otherwise by title+released
  let movieId = null
  if (imdbID) {
    const { data: byImdb, error: byImdbErr } = await supabase
      .from("movies")
      .select("movie_id")
      .eq("title", title) // schema doesn't include imdb, so best-effort
      .limit(1)

    if (byImdbErr) return { error: byImdbErr }
    if (byImdb && byImdb.length) movieId = byImdb[0].movie_id
  }

  if (!movieId) {
    const { data: existing, error: findErr } = await supabase
      .from("movies")
      .select("movie_id")
      .eq("title", title)
      .eq("released", released)
      .limit(1)

    if (findErr) return { error: findErr }
    if (existing && existing.length) movieId = existing[0].movie_id
  }

  // If not found, attempt to insert a movie row. If the insert fails due to a conflict
  // (another client inserted the same title concurrently), re-query for the movie.
  if (!movieId) {
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("movies")
        .insert([
          {
            title,
            released,
            description,
            imdb_id: imdbID,
          },
        ])
        .select("movie_id")
        .limit(1)

      if (insertErr) {
        // If insertErr indicates a conflict, just re-query; otherwise return error
        // Supabase may return a 409/400 depending on PostgREST; we'll re-query regardless.
        const { data: recheck, error: recheckErr } = await supabase
          .from("movies")
          .select("movie_id")
          .eq("title", title)
          .eq("released", released)
          .limit(1)

        if (recheckErr) return { error: insertErr }
        if (recheck && recheck.length) movieId = recheck[0].movie_id
        else return { error: insertErr }
      } else if (inserted && inserted.length) {
        movieId = inserted[0].movie_id
      }
    } catch (e) {
      // Unexpected error, try re-query once
      const { data: recheck, error: recheckErr } = await supabase
        .from("movies")
        .select("movie_id")
        .eq("title", title)
        .eq("released", released)
        .limit(1)
      if (recheckErr) return { error: e }
      if (recheck && recheck.length) movieId = recheck[0].movie_id
      else return { error: e }
    }
  }

  if (!movieId) return { error: new Error("Could not determine movie_id") }

  // Prevent duplicate user_watched_movies entries
  const { data: existingWatch, error: watchFindErr } = await supabase
    .from("user_watched_movies")
    .select("id")
    .eq("user_id", userRow.id)
    .eq("movie_id", movieId)
    .limit(1)

  if (watchFindErr) return { error: watchFindErr }
  if (existingWatch && existingWatch.length)
    return { message: "already watched", watched: existingWatch[0] }

  // Insert into user_watched_movies
  const { data: watchedData, error: watchedErr } = await supabase
    .from("user_watched_movies")
    .insert([
      {
        user_id: userRow.id,
        movie_id: movieId,
      },
    ])
    .select()

  if (watchedErr) return { error: watchedErr }
  return { movieId, watched: watchedData }
}

/**
 * Fetch watched movies for a given user (by email).
 * Returns an array of movie-like objects shaped for display (Title, Year, Poster, imdbID, movie_id, watched_at, description)
 */
export async function getWatchedMovies(user) {
  if (!user || !user.email) return { error: new Error("user.email required") }

  // Find user_info row for this email
  const { data: users, error: userFindError } = await supabase
    .from("user_info")
    .select("id")
    .eq("email", user.email)
    .limit(1)

  if (userFindError) return { error: userFindError }
  const userRow = Array.isArray(users) ? users[0] : users
  if (!userRow || !userRow.id)
    return { error: new Error("user_info row not found for this user") }

  // Query user_watched_movies and join movies
  const { data, error } = await supabase
    .from("user_watched_movies")
    .select(
      `id, watched_at, movies(movie_id, title, released, description, imdb_id)`
    )
    .eq("user_id", userRow.id)
    .order("watched_at", { ascending: false })

  if (error) return { error }

  let mapped = (data || []).map((row) => {
    const mv = row.movies || {}
    return {
      Title: mv.title || "",
      Year: mv.released ? new Date(mv.released).getFullYear().toString() : "",
      Poster: null,
      imdbID: mv.imdb_id || null,
      movie_id: mv.movie_id,
      watched_at: row.watched_at,
      description: mv.description || null,
    }
  })

  // If any rows have an imdbID, attempt to fetch OMDb details (Poster/Title/Year) to improve display.
  const apiKey = process.env.REACT_APP_OMDB_API_KEY || "d86bc547"
  const withImdb = mapped.filter((m) => m.imdbID)
  if (withImdb.length) {
    try {
      const fetches = withImdb.map((m) =>
        fetch(
          `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(
            m.imdbID
          )}`
        )
          .then((r) => r.json())
          .catch(() => null)
      )
      const details = await Promise.all(fetches)
      mapped = mapped.map((m) => {
        if (!m.imdbID) return m
        const info = details.find(
          (d) => d && (d.imdbID === m.imdbID || d.imdbID === m.imdbID)
        )
        if (!info) return m
        return {
          ...m,
          Title: info.Title || m.Title,
          Year: info.Year || m.Year,
          Poster: info.Poster && info.Poster !== "N/A" ? info.Poster : m.Poster,
        }
      })
    } catch (e) {
      // Ignore OMDb failures; return DB-sourced rows.
    }
  }

  return { movies: mapped }
}

/**
 * Check whether a movie (by imdbID or movie_id) is already watched for the given user.
 * Returns { watched: boolean } or { error }
 */
export async function isMovieWatched(
  user,
  { imdbID = null, movie_id = null } = {}
) {
  if (!user || !user.email) return { error: new Error("user.email required") }

  // Find user_info row for this email
  const { data: users, error: userFindError } = await supabase
    .from("user_info")
    .select("id")
    .eq("email", user.email)
    .limit(1)

  if (userFindError) return { error: userFindError }
  const userRow = Array.isArray(users) ? users[0] : users
  if (!userRow || !userRow.id)
    return { error: new Error("user_info row not found for this user") }

  let resolvedMovieId = movie_id

  if (!resolvedMovieId && imdbID) {
    const { data: mv, error: mvErr } = await supabase
      .from("movies")
      .select("movie_id")
      .eq("imdb_id", imdbID)
      .limit(1)

    if (mvErr) return { error: mvErr }
    if (mv && mv.length) resolvedMovieId = mv[0].movie_id
    else return { watched: false }
  }

  if (!resolvedMovieId) return { watched: false }

  const { data: existing, error: exErr } = await supabase
    .from("user_watched_movies")
    .select("id")
    .eq("user_id", userRow.id)
    .eq("movie_id", resolvedMovieId)
    .limit(1)

  if (exErr) return { error: exErr }
  return { watched: Array.isArray(existing) && existing.length > 0 }
}
