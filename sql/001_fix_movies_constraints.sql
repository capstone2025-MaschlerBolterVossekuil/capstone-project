-- Migration: fix movies/movie_preferences circular FK and add imdb_id for reliable upserts
-- 1) Drop the problematic foreign key from movies -> movie_preferences
ALTER TABLE IF EXISTS public.movies DROP CONSTRAINT IF EXISTS movies_movie_id_fkey;
-- 2) Add an imdb_id column (nullable) to movies to allow stable dedup/upsert
ALTER TABLE IF EXISTS public.movies
ADD COLUMN IF NOT EXISTS imdb_id text;
-- 3) Create a unique index on imdb_id (only when present)
CREATE UNIQUE INDEX IF NOT EXISTS movies_imdb_id_idx ON public.movies (imdb_id);
-- 4) Optionally add a unique constraint on (user_id, movie_id) to prevent duplicate watched rows
CREATE UNIQUE INDEX IF NOT EXISTS user_watched_unique_idx ON public.user_watched_movies (user_id, movie_id);
-- Note: After applying this migration you can upsert movies using `imdb_id` as the conflict target.
-- Example upsert SQL after migration:
-- INSERT INTO public.movies (title, released, description, imdb_id)
-- VALUES ('Title', '2025-01-01', 'Desc', 'tt1234567')
-- ON CONFLICT (imdb_id) DO UPDATE SET title = EXCLUDED.title RETURNING movie_id;
-- If you want to re-create a foreign key between movies and movie_preferences, consider a different design
-- (for example: user_watched_movies linking user_info and movies, and movie_preferences storing only preferences JSON).