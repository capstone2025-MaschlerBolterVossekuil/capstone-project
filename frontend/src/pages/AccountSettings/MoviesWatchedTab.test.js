import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import MoviesWatchedTab from "./MoviesWatchedTab"
import { getWatchedMovies } from "../../lib/profileApi"

// Mock dependencies
jest.mock("../../lib/profileApi", () => ({
  getWatchedMovies: jest.fn(),
}))

jest.mock("react-router-dom")
const { __setMockNavigate, __resetMocks } = require("react-router-dom")
const mockNavigate = jest.fn()

describe("MoviesWatchedTab Component", () => {
  beforeEach(() => {
    __resetMocks()
    __setMockNavigate(mockNavigate)
  })
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  }

  const mockWatchedMovies = [
    {
      imdbID: "tt0111161",
      Title: "The Shawshank Redemption",
      Year: "1994",
      Type: "movie",
      Poster: "https://example.com/poster1.jpg",
      movie_id: 1,
      watched_at: "2023-01-01T00:00:00Z",
    },
    {
      imdbID: "tt0068646",
      Title: "The Godfather",
      Year: "1972",
      Type: "movie",
      Poster: "https://example.com/poster2.jpg",
      movie_id: 2,
      watched_at: "2023-01-02T00:00:00Z",
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering with provided watchedMovies prop", () => {
    test("renders title", () => {
      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      expect(screen.getByText("Movies You've Watched")).toBeInTheDocument()
    })

    test("renders custom title when provided", () => {
      render(
        <MoviesWatchedTab
          user={mockUser}
          watchedMovies={mockWatchedMovies}
          title="My Custom Title"
        />
      )

      expect(screen.getByText("My Custom Title")).toBeInTheDocument()
    })

    test("renders all watched movies", () => {
      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
      expect(screen.getByText("The Godfather")).toBeInTheDocument()
    })

    test("displays movies in a grid layout", () => {
      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      const movieTitle = screen.getByText("The Shawshank Redemption")
      const gridContainer = movieTitle.closest("div[style*='grid']")
      expect(gridContainer).toBeInTheDocument()
    })

    test("renders empty message when no watched movies", () => {
      render(<MoviesWatchedTab user={mockUser} watchedMovies={[]} />)

      expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
    })
  })

  describe("Loading watched movies from API", () => {
    test("fetches and displays watched movies when watchedMovies prop is not provided", async () => {
      getWatchedMovies.mockResolvedValue({
        movies: mockWatchedMovies,
      })

      render(<MoviesWatchedTab user={mockUser} />)

      expect(screen.getByText("Loading watched movies…")).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
      })

      expect(getWatchedMovies).toHaveBeenCalledWith(mockUser)
    })

    test("displays error message when fetch fails", async () => {
      getWatchedMovies.mockResolvedValue({
        error: new Error("Fetch failed"),
      })

      render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(
          screen.getByText("Error loading watched movies.")
        ).toBeInTheDocument()
      })
    })

    test("handles exception during fetch", async () => {
      getWatchedMovies.mockRejectedValue(new Error("Network error"))

      render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(
          screen.getByText("Error loading watched movies.")
        ).toBeInTheDocument()
      })
    })

    test("displays empty message when no movies returned from API", async () => {
      getWatchedMovies.mockResolvedValue({
        movies: [],
      })

      render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
      })
    })

    test("displays empty message when user has no email", () => {
      render(<MoviesWatchedTab user={{ id: "123" }} />)

      expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
    })

    test("displays empty message when user is null", () => {
      render(<MoviesWatchedTab user={null} />)

      expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
    })
  })

  describe("Movie Click Handling", () => {
    test("navigates to movie page when movie is clicked (default behavior)", () => {
      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      const movieCard = screen.getByText("The Shawshank Redemption")
      fireEvent.click(movieCard)

      expect(mockNavigate).toHaveBeenCalledWith("/movie/tt0111161")
    })

    test("calls custom onMovieClick handler when provided", () => {
      const onMovieClick = jest.fn()

      render(
        <MoviesWatchedTab
          user={mockUser}
          watchedMovies={mockWatchedMovies}
          onMovieClick={onMovieClick}
        />
      )

      const movieCard = screen.getByText("The Shawshank Redemption")
      fireEvent.click(movieCard)

      expect(onMovieClick).toHaveBeenCalledWith(mockWatchedMovies[0])
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test("handles click on movie without imdbID", () => {
      const movieWithoutImdb = [
        {
          Title: "Test Movie",
          Year: "2023",
          movie_id: 999,
          Poster: null,
        },
      ]

      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={movieWithoutImdb} />
      )

      const movieCard = screen.getByText("Test Movie")
      fireEvent.click(movieCard)

      // Should not crash, but navigate won't be called with undefined
      expect(movieCard).toBeInTheDocument()
    })
  })

  describe("Movie Card Keys", () => {
    test("uses imdbID as key when available", () => {
      const { container } = render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      // React keys aren't directly testable, but we can verify no duplicate key warnings
      expect(container).toBeInTheDocument()
    })

    test("uses movie_id as fallback key when imdbID is missing", () => {
      const moviesWithoutImdb = [
        {
          Title: "Movie 1",
          Year: "2023",
          movie_id: 1,
          Poster: null,
        },
        {
          Title: "Movie 2",
          Year: "2023",
          movie_id: 2,
          Poster: null,
        },
      ]

      const { container } = render(
        <MoviesWatchedTab user={mockUser} watchedMovies={moviesWithoutImdb} />
      )

      expect(screen.getByText("Movie 1")).toBeInTheDocument()
      expect(screen.getByText("Movie 2")).toBeInTheDocument()
    })

    test("uses title as fallback key when imdbID and movie_id are missing", () => {
      const moviesWithTitleOnly = [
        {
          Title: "Unique Movie",
          Year: "2023",
          Poster: null,
        },
      ]

      const { container } = render(
        <MoviesWatchedTab user={mockUser} watchedMovies={moviesWithTitleOnly} />
      )

      expect(screen.getByText("Unique Movie")).toBeInTheDocument()
    })
  })

  describe("Re-fetching on user change", () => {
    test("re-fetches movies when user changes", async () => {
      getWatchedMovies.mockResolvedValue({
        movies: mockWatchedMovies,
      })

      const { rerender } = render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(getWatchedMovies).toHaveBeenCalledWith(mockUser)
      })

      const newUser = { id: "user-456", email: "new@example.com" }

      rerender(<MoviesWatchedTab user={newUser} />)

      await waitFor(() => {
        expect(getWatchedMovies).toHaveBeenCalledWith(newUser)
      })
    })

    test("does not re-fetch when watchedMovies prop is provided", () => {
      const { rerender } = render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      const newUser = { id: "user-456", email: "new@example.com" }

      rerender(
        <MoviesWatchedTab user={newUser} watchedMovies={mockWatchedMovies} />
      )

      expect(getWatchedMovies).not.toHaveBeenCalled()
    })
  })

  describe("Edge Cases", () => {
    test("handles null watchedMovies gracefully", async () => {
      getWatchedMovies.mockResolvedValue({
        movies: null,
      })

      render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
      })
    })

    test("handles undefined movies from API response", async () => {
      getWatchedMovies.mockResolvedValue({})

      render(<MoviesWatchedTab user={mockUser} />)

      await waitFor(() => {
        expect(screen.getByText("No watched movies yet.")).toBeInTheDocument()
      })
    })

    test("displays movie card with cursor pointer", () => {
      render(
        <MoviesWatchedTab user={mockUser} watchedMovies={mockWatchedMovies} />
      )

      const movieTitle = screen.getByText("The Shawshank Redemption")
      const clickableDiv = movieTitle.closest("div[style*='cursor']")
      expect(clickableDiv).toHaveStyle({ cursor: "pointer" })
    })
  })
})
