export interface MoviePreferences {
  /** FK to user_info.id (bigint) */
  user_id: number

  /** whether this is a child account */
  child_account: boolean

  /** FK to movies.movie_id (integer) — optional/nullable */
  movies_watched_id?: number | null

  /** free-form preferences text (may contain JSON) */
  preferences?: string | null
}

export type Preferences = MoviePreferences
