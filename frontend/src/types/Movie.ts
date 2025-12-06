export interface Movie {
  /** Primary key (integer) */
  movie_id: number

  /** Title text */
  title: string

  /** Release date (use ISO date string in frontend) */
  released?: string | null

  /** Description / plot */
  description?: string | null
}

export type MovieRecord = Movie
