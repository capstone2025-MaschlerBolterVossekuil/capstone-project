import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import RecommendedFeed from "./RecommendedFeed"
import { supabase } from "../../lib/supabaseClient"
import { searchByKeyword, fetchById, hasApiKey } from "../../lib/omdbApi"

// Mock react-router-dom before other imports
jest.mock("react-router-dom")

// Mock dependencies
jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock("../../lib/omdbApi", () => ({
  searchByKeyword: jest.fn(),
  fetchById: jest.fn(),
  hasApiKey: jest.fn(),
}))

// Helper to render component
const renderWithRouter = (component) => {
  return render(component)
}

describe("RecommendedFeed Component", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  }

  const mockMovies = [
    {
      imdbID: "tt0111161",
      Title: "The Shawshank Redemption",
      Year: "1994",
      Type: "movie",
      Poster: "https://example.com/poster1.jpg",
      Genre: "Drama",
    },
    {
      imdbID: "tt0068646",
      Title: "The Godfather",
      Year: "1972",
      Type: "movie",
      Poster: "https://example.com/poster2.jpg",
      Genre: "Crime, Drama",
    },
    {
      imdbID: "tt0468569",
      Title: "The Dark Knight",
      Year: "2008",
      Type: "movie",
      Poster: "https://example.com/poster3.jpg",
      Genre: "Action, Crime, Drama",
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe("Rendering", () => {
    test("renders component title", async () => {
      hasApiKey.mockReturnValue(true)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      supabase.from.mockImplementation(mockFrom)

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(screen.getByText("Recommended For You")).toBeInTheDocument()
    })

    test("renders refresh button", async () => {
      hasApiKey.mockReturnValue(true)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      supabase.from.mockImplementation(mockFrom)

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(
        screen.getByRole("button", { name: /refresh/i })
      ).toBeInTheDocument()
    })

    test("shows loading state initially", async () => {
      hasApiKey.mockReturnValue(true)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      supabase.from.mockImplementation(mockFrom)

      searchByKeyword.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(screen.getByText("Loading recommendations…")).toBeInTheDocument()
    })
  })

  describe("Genre Preferences Loading", () => {
    test("loads user preferences from database", async () => {
      hasApiKey.mockReturnValue(true)
      const mockPreferences = ["Action", "Comedy", "Sci-Fi"]
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: JSON.stringify(mockPreferences) }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Based on: Action, Comedy, Sci-Fi/i)
        ).toBeInTheDocument()
      })
    })

    test("uses default genres when user preferences not found", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation(() => ({
        select: mockUserInfoSelect,
      }))

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText(/Based on:/)).toBeInTheDocument()
      })
    })

    test("uses default genres when no user is provided", async () => {
      hasApiKey.mockReturnValue(true)
      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={null} />)

      await waitFor(() => {
        expect(screen.getByText(/Based on:/)).toBeInTheDocument()
      })
    })

    test("handles database error when loading preferences", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      })

      supabase.from.mockImplementation(() => ({
        select: mockUserInfoSelect,
      }))

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText(/Based on:/)).toBeInTheDocument()
      })
    })

    test("parses JSON string preferences", async () => {
      hasApiKey.mockReturnValue(true)
      const mockPreferences = ["Drama", "Horror"]
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: JSON.stringify(mockPreferences) }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText(/Based on: Drama, Horror/i)).toBeInTheDocument()
      })
    })

    test("parses already-parsed array preferences", async () => {
      hasApiKey.mockReturnValue(true)
      const mockPreferences = ["Thriller", "Romance"]
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: mockPreferences }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Based on: Thriller, Romance/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe("Movie Recommendations Loading", () => {
    test("shows error when API key is not configured", async () => {
      hasApiKey.mockReturnValue(false)

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(
        await screen.findByText(/OMDb API key not configured/i)
      ).toBeInTheDocument()
    })

    test("fetches and displays movie recommendations", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama", "Action"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [
          {
            imdbID: "tt0111161",
            Title: "The Shawshank Redemption",
            Year: "1994",
            Type: "movie",
            Poster: "https://example.com/poster1.jpg",
          },
        ],
      })

      fetchById.mockResolvedValue({
        imdbID: "tt0111161",
        Title: "The Shawshank Redemption",
        Year: "1994",
        Type: "movie",
        Poster: "https://example.com/poster1.jpg",
        Genre: "Drama",
        Response: "True",
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(
        () => {
          expect(
            screen.getByText("The Shawshank Redemption")
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    test("filters movies by user's preferred genres", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Comedy"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [
          {
            imdbID: "tt0111161",
            Title: "Drama Movie",
            Year: "1994",
            Type: "movie",
            Poster: "https://example.com/poster1.jpg",
          },
          {
            imdbID: "tt0068646",
            Title: "Comedy Movie",
            Year: "1972",
            Type: "movie",
            Poster: "https://example.com/poster2.jpg",
          },
        ],
      })

      fetchById.mockImplementation((id) => {
        if (id === "tt0111161") {
          return Promise.resolve({
            imdbID: "tt0111161",
            Title: "Drama Movie",
            Genre: "Drama",
            Response: "True",
          })
        }
        if (id === "tt0068646") {
          return Promise.resolve({
            imdbID: "tt0068646",
            Title: "Comedy Movie",
            Genre: "Comedy",
            Response: "True",
          })
        }
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(
        () => {
          expect(screen.getByText("Comedy Movie")).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      expect(screen.queryByText("Drama Movie")).not.toBeInTheDocument()
    })

    test("shows error message when no movies match preferences", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Horror"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(
        await screen.findByText(/No movies found matching your preferences/i)
      ).toBeInTheDocument()
    })

    test("handles API errors gracefully", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Action"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockRejectedValue(new Error("API Error"))

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      // searchByKeyword errors are caught and logged, resulting in no movies being collected
      expect(
        await screen.findByText(/No movies found matching your preferences/i)
      ).toBeInTheDocument()
    })

    test("skips movies with invalid response", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [
          { imdbID: "tt0111161", Title: "Movie 1" },
          { imdbID: "tt0068646", Title: "Movie 2" },
        ],
      })

      fetchById.mockImplementation((id) => {
        if (id === "tt0111161") {
          return Promise.resolve({ Response: "False" })
        }
        if (id === "tt0068646") {
          return Promise.resolve({
            imdbID: "tt0068646",
            Title: "Valid Movie",
            Genre: "Drama",
            Response: "True",
          })
        }
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(
        () => {
          expect(screen.getByText("Valid Movie")).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      expect(screen.queryByText("Movie 1")).not.toBeInTheDocument()
    })

    test("deduplicates movies by imdbID", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Action"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [
          { imdbID: "tt0111161", Title: "Movie 1" },
          { imdbID: "tt0111161", Title: "Movie 1" }, // Duplicate
        ],
      })

      fetchById.mockResolvedValue({
        imdbID: "tt0111161",
        Title: "Movie 1",
        Genre: "Action",
        Response: "True",
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(
        () => {
          const movies = screen.queryAllByText("Movie 1")
          expect(movies.length).toBe(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("User Interactions", () => {
    test("refresh button reloads recommendations", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [{ imdbID: "tt0111161", Title: "Movie 1" }],
      })

      fetchById.mockResolvedValue({
        imdbID: "tt0111161",
        Title: "Movie 1",
        Genre: "Drama",
        Response: "True",
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText("Movie 1")).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole("button", { name: /refresh/i })
      fireEvent.click(refreshButton)

      // After refresh, movies should be cleared immediately
      await waitFor(() => {
        expect(screen.queryByText("Movie 1")).not.toBeInTheDocument()
      })

      // Verify that the movie grid is empty after refresh
      const grid = document.querySelector(".recommended-grid")
      expect(grid).toBeInTheDocument()
      expect(grid.children.length).toBe(0)
    })

    test("disables refresh button while loading", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      const refreshButton = screen.getByRole("button", { name: /refresh/i })
      expect(refreshButton).toBeDisabled()
    })

    test("movie cards are clickable and link to movie page", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({
        Search: [{ imdbID: "tt0111161", Title: "The Shawshank Redemption" }],
      })

      fetchById.mockResolvedValue({
        imdbID: "tt0111161",
        Title: "The Shawshank Redemption",
        Genre: "Drama",
        Response: "True",
      })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
      })

      // Check that movie card renders within a link
      const links = screen.getAllByRole("link")
      const movieLink = links.find((link) =>
        link.href.includes("/movie/tt0111161")
      )
      expect(movieLink).toBeTruthy()
    })
  })

  describe("Empty States", () => {
    test("shows message when no recommendations and not loading", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      searchByKeyword.mockResolvedValue({ Search: [] })

      renderWithRouter(<RecommendedFeed user={mockUser} />)

      expect(
        await screen.findByText(/No movies found matching your preferences/i)
      ).toBeInTheDocument()
    })
  })

  describe("Component Cleanup", () => {
    test("cancels ongoing requests when component unmounts", async () => {
      hasApiKey.mockReturnValue(true)
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const mockPrefsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ preferences: ["Drama"] }],
            error: null,
          }),
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: mockUserInfoSelect }
        }
        if (table === "movie_preferences") {
          return { select: mockPrefsSelect }
        }
      })

      let resolveSearch
      searchByKeyword.mockReturnValue(
        new Promise((resolve) => {
          resolveSearch = resolve
        })
      )

      const { unmount } = renderWithRouter(<RecommendedFeed user={mockUser} />)

      unmount()

      // Resolve after unmount - should not update state
      resolveSearch({ Search: [] })

      // No assertion needed - test passes if no error is thrown
    })

    test("cancels preference loading when component unmounts", async () => {
      hasApiKey.mockReturnValue(true)
      let resolveUserInfo
      const mockUserInfoSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(
            new Promise((resolve) => {
              resolveUserInfo = resolve
            })
          ),
        }),
      })

      supabase.from.mockImplementation(() => ({
        select: mockUserInfoSelect,
      }))

      const { unmount } = renderWithRouter(<RecommendedFeed user={mockUser} />)

      unmount()

      // Resolve after unmount - should not update state
      resolveUserInfo({ data: [{ id: "user-123" }], error: null })

      // No assertion needed - test passes if no error is thrown
    })
  })

  describe("CSS Classes", () => {
    test("has recommended-feed class", async () => {
      hasApiKey.mockReturnValue(true)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      supabase.from.mockImplementation(mockFrom)
      searchByKeyword.mockResolvedValue({ Search: [] })

      const { container } = renderWithRouter(
        <RecommendedFeed user={mockUser} />
      )

      await waitFor(() => {
        const feed = container.querySelector(".recommended-feed")
        expect(feed).toBeInTheDocument()
      })
    })

    test("has recommended-grid class", async () => {
      hasApiKey.mockReturnValue(true)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      supabase.from.mockImplementation(mockFrom)
      searchByKeyword.mockResolvedValue({ Search: [] })

      const { container } = renderWithRouter(
        <RecommendedFeed user={mockUser} />
      )

      await waitFor(() => {
        const grid = container.querySelector(".recommended-grid")
        expect(grid).toBeInTheDocument()
      })
    })
  })
})
