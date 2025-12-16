import {
  saveProfileAndPreferences,
  addMovieToWatched,
  getWatchedMovies,
  isMovieWatched,
} from "./profileApi"
import { supabase } from "./supabaseClient"

// Mock supabase client
jest.mock("./supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock fetch for OMDb API calls
global.fetch = jest.fn()

describe("profileApi", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("saveProfileAndPreferences", () => {
    test("successfully creates user_info and movie_preferences", async () => {
      const mockUserId = "user-123"
      const mockUserData = [{ id: mockUserId }]
      const mockPrefData = [
        {
          user_id: mockUserId,
          child_account: false,
          movies_watched_id: null,
          preferences: "{}",
        },
      ]

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      const upsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockPrefData,
          error: null,
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { insert: insertMock }
        }
        if (table === "movie_preferences") {
          return { upsert: upsertMock }
        }
      })

      const result = await saveProfileAndPreferences({
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
      })

      expect(result.userInfo).toEqual({ id: mockUserId })
      expect(result.moviePreferences).toEqual(mockPrefData)
      expect(insertMock).toHaveBeenCalledWith([
        {
          user_name: "test@example.com",
          first_name: "John",
          last_name: "Doe",
          email: "test@example.com",
        },
      ])
    })

    test("returns error when email is missing", async () => {
      const result = await saveProfileAndPreferences({
        first_name: "John",
        last_name: "Doe",
      })

      expect(result.error).toBeDefined()
      expect(result.error.message).toBe("email required")
    })

    test("handles user_info insert error", async () => {
      const mockError = new Error("Insert failed")

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      supabase.from.mockReturnValue({ insert: insertMock })

      const result = await saveProfileAndPreferences({
        email: "test@example.com",
      })

      expect(result.error).toBe(mockError)
    })

    test("handles movie_preferences upsert error", async () => {
      const mockUserId = "user-123"
      const mockUserData = [{ id: mockUserId }]
      const mockPrefError = new Error("Upsert failed")

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      const upsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockPrefError,
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { insert: insertMock }
        }
        if (table === "movie_preferences") {
          return { upsert: upsertMock }
        }
      })

      const result = await saveProfileAndPreferences({
        email: "test@example.com",
      })

      expect(result.userInfo).toEqual({ id: mockUserId })
      expect(result.error).toBe(mockPrefError)
    })
  })

  describe("addMovieToWatched", () => {
    test("successfully adds movie to watched list", async () => {
      const mockUserId = "user-123"
      const mockMovieId = 456

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectMovieMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ movie_id: mockMovieId }],
              error: null,
            }),
          }),
        }),
      })

      const selectWatchedCheckMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const insertWatchedMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1, user_id: mockUserId, movie_id: mockMovieId }],
          error: null,
        }),
      })

      let callCount = 0
      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "movies") {
          callCount++
          if (callCount === 1) {
            return { select: selectMovieMock }
          }
        }
        if (table === "user_watched_movies") {
          return {
            select: selectWatchedCheckMock,
            insert: insertWatchedMock,
          }
        }
      })

      const result = await addMovieToWatched(
        { Title: "Test Movie", Released: "2023-01-01", Plot: "Test plot" },
        { email: "test@example.com" }
      )

      expect(result.movieId).toBe(mockMovieId)
      expect(result.watched).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    test("returns error when movie or user is missing", async () => {
      const result1 = await addMovieToWatched(null, { email: "test@test.com" })
      expect(result1.error).toBeDefined()

      const result2 = await addMovieToWatched({ Title: "Test" }, null)
      expect(result2.error).toBeDefined()

      const result3 = await addMovieToWatched({ Title: "Test" }, {})
      expect(result3.error).toBeDefined()
    })

    test("returns message when movie already watched", async () => {
      const mockUserId = "user-123"
      const mockMovieId = 456

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectMovieMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ movie_id: mockMovieId }],
              error: null,
            }),
          }),
        }),
      })

      const selectWatchedCheckMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: 1, user_id: mockUserId, movie_id: mockMovieId }],
              error: null,
            }),
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "movies") {
          return { select: selectMovieMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedCheckMock }
        }
      })

      const result = await addMovieToWatched(
        { Title: "Test Movie", Released: "2023-01-01" },
        { email: "test@example.com" }
      )

      expect(result.message).toBe("already watched")
      expect(result.watched).toBeDefined()
    })

    test("handles user not found error", async () => {
      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({ select: selectUserMock })

      const result = await addMovieToWatched(
        { Title: "Test Movie" },
        { email: "nonexistent@example.com" }
      )

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain("user_info row not found")
    })
  })

  describe("getWatchedMovies", () => {
    test("successfully retrieves watched movies", async () => {
      const mockUserId = "user-123"
      const mockWatchedData = [
        {
          id: 1,
          watched_at: "2023-01-01T00:00:00Z",
          movies: {
            movie_id: 1,
            title: "Test Movie",
            released: "2023-01-01",
            description: "Test description",
            imdb_id: "tt1234567",
          },
        },
      ]

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectWatchedMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockWatchedData,
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedMock }
        }
      })

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          imdbID: "tt1234567",
          Title: "Test Movie from OMDb",
          Year: "2023",
          Poster: "https://example.com/poster.jpg",
        }),
      })

      const result = await getWatchedMovies({ email: "test@example.com" })

      expect(result.movies).toBeDefined()
      expect(result.movies.length).toBe(1)
      expect(result.movies[0].Title).toBe("Test Movie from OMDb")
      expect(result.movies[0].imdbID).toBe("tt1234567")
    })

    test("returns error when user email is missing", async () => {
      const result = await getWatchedMovies({})

      expect(result.error).toBeDefined()
      expect(result.error.message).toBe("user.email required")
    })

    test("handles user not found error", async () => {
      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({ select: selectUserMock })

      const result = await getWatchedMovies({ email: "nonexistent@test.com" })

      expect(result.error).toBeDefined()
      expect(result.error.message).toContain("user_info row not found")
    })

    test("handles movies without imdbID", async () => {
      const mockUserId = "user-123"
      const mockWatchedData = [
        {
          id: 1,
          watched_at: "2023-01-01T00:00:00Z",
          movies: {
            movie_id: 1,
            title: "Test Movie",
            released: "2023-01-01",
            description: "Test description",
            imdb_id: null,
          },
        },
      ]

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectWatchedMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockWatchedData,
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedMock }
        }
      })

      const result = await getWatchedMovies({ email: "test@example.com" })

      expect(result.movies).toBeDefined()
      expect(result.movies.length).toBe(1)
      expect(result.movies[0].Title).toBe("Test Movie")
      expect(result.movies[0].imdbID).toBeNull()
    })
  })

  describe("isMovieWatched", () => {
    test("returns true when movie is watched by imdbID", async () => {
      const mockUserId = "user-123"
      const mockMovieId = 456

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectMovieMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ movie_id: mockMovieId }],
            error: null,
          }),
        }),
      })

      const selectWatchedMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: 1 }],
              error: null,
            }),
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "movies") {
          return { select: selectMovieMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedMock }
        }
      })

      const result = await isMovieWatched(
        { email: "test@example.com" },
        { imdbID: "tt1234567" }
      )

      expect(result.watched).toBe(true)
    })

    test("returns false when movie is not watched", async () => {
      const mockUserId = "user-123"
      const mockMovieId = 456

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectMovieMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ movie_id: mockMovieId }],
            error: null,
          }),
        }),
      })

      const selectWatchedMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "movies") {
          return { select: selectMovieMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedMock }
        }
      })

      const result = await isMovieWatched(
        { email: "test@example.com" },
        { imdbID: "tt1234567" }
      )

      expect(result.watched).toBe(false)
    })

    test("returns false when movie is not found in database", async () => {
      const mockUserId = "user-123"

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectMovieMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "movies") {
          return { select: selectMovieMock }
        }
      })

      const result = await isMovieWatched(
        { email: "test@example.com" },
        { imdbID: "tt0000000" }
      )

      expect(result.watched).toBe(false)
    })

    test("returns error when user email is missing", async () => {
      const result = await isMovieWatched({}, { imdbID: "tt1234567" })

      expect(result.error).toBeDefined()
      expect(result.error.message).toBe("user.email required")
    })

    test("works with movie_id parameter", async () => {
      const mockUserId = "user-123"
      const mockMovieId = 456

      const selectUserMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockUserId }],
            error: null,
          }),
        }),
      })

      const selectWatchedMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: 1 }],
              error: null,
            }),
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectUserMock }
        }
        if (table === "user_watched_movies") {
          return { select: selectWatchedMock }
        }
      })

      const result = await isMovieWatched(
        { email: "test@example.com" },
        { movie_id: mockMovieId }
      )

      expect(result.watched).toBe(true)
    })
  })
})
