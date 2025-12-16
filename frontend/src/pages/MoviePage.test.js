import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import MoviePage from "./MoviePage"
import { supabase } from "../lib/supabaseClient"
import { addMovieToWatched, isMovieWatched } from "../lib/profileApi"

// Mock dependencies
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}))

jest.mock("../lib/profileApi", () => ({
  addMovieToWatched: jest.fn(),
  isMovieWatched: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock react-router-dom
jest.mock("react-router-dom")
const {
  __setMockNavigate,
  __setMockParams,
  __resetMocks,
} = require("react-router-dom")
const mockNavigate = jest.fn()

describe("MoviePage Component", () => {
  beforeEach(() => {
    __resetMocks()
    __setMockNavigate(mockNavigate)
    __setMockParams({ imdbID: "tt0111161" })
  })
  const mockMovie = {
    imdbID: "tt0111161",
    Title: "The Shawshank Redemption",
    Year: "1994",
    Released: "14 Oct 1994",
    Runtime: "142 min",
    Genre: "Drama",
    Director: "Frank Darabont",
    Actors: "Tim Robbins, Morgan Freeman",
    Plot: "Two imprisoned men bond over a number of years...",
    Language: "English",
    Poster: "https://example.com/poster.jpg",
    imdbRating: "9.3",
    imdbVotes: "2,500,000",
    BoxOffice: "$28,341,469",
    Production: "Columbia Pictures",
    Ratings: [
      { Source: "Internet Movie Database", Value: "9.3/10" },
      { Source: "Rotten Tomatoes", Value: "91%" },
    ],
  }

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    })
    isMovieWatched.mockResolvedValue({ watched: false })
  })

  describe("Rendering with initialMovie prop", () => {
    test("renders movie title and year", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(
        screen.getByText("The Shawshank Redemption (1994)")
      ).toBeInTheDocument()
    })

    test("renders movie plot", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(
        screen.getByText(/Two imprisoned men bond over a number of years/)
      ).toBeInTheDocument()
    })

    test("renders movie genre", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("Genres:")).toBeInTheDocument()
      expect(screen.getByText("Drama")).toBeInTheDocument()
    })

    test("renders movie director", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("Director:")).toBeInTheDocument()
      expect(screen.getByText("Frank Darabont")).toBeInTheDocument()
    })

    test("renders movie actors", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("Actors:")).toBeInTheDocument()
      expect(
        screen.getByText("Tim Robbins, Morgan Freeman")
      ).toBeInTheDocument()
    })

    test("renders movie poster when available", () => {
      render(<MoviePage movie={mockMovie} />)

      const poster = screen.getByAltText("The Shawshank Redemption poster")
      expect(poster).toBeInTheDocument()
      expect(poster).toHaveAttribute("src", "https://example.com/poster.jpg")
    })

    test("renders placeholder when poster is N/A", () => {
      const movieWithoutPoster = { ...mockMovie, Poster: "N/A" }
      render(<MoviePage movie={movieWithoutPoster} />)

      expect(screen.getByText("No Image")).toBeInTheDocument()
    })

    test("renders Back button", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
    })

    test("renders IMDB rating", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("IMDB Rating:")).toBeInTheDocument()
      expect(screen.getByText("9.3 / 10")).toBeInTheDocument()
    })

    test("renders IMDB votes", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("IMDB Votes:")).toBeInTheDocument()
      expect(screen.getByText("2,500,000")).toBeInTheDocument()
    })

    test("renders box office information", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("Box Office:")).toBeInTheDocument()
      expect(screen.getByText("$28,341,469")).toBeInTheDocument()
    })

    test("renders other ratings", () => {
      render(<MoviePage movie={mockMovie} />)

      expect(screen.getByText("Other Ratings:")).toBeInTheDocument()
      expect(
        screen.getByText("Internet Movie Database: 9.3/10")
      ).toBeInTheDocument()
      expect(screen.getByText("Rotten Tomatoes: 91%")).toBeInTheDocument()
    })
  })

  describe("Loading movie by imdbID from URL", () => {
    test("loads movie data from OMDb API", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: "True",
          ...mockMovie,
        }),
      })

      render(<MoviePage movie={null} />)

      expect(screen.getByText("Loading…")).toBeInTheDocument()

      await waitFor(() => {
        expect(
          screen.getByText("The Shawshank Redemption (1994)")
        ).toBeInTheDocument()
      })
    })

    test("displays error when movie fetch fails", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: "False",
          Error: "Movie not found!",
        }),
      })

      render(<MoviePage movie={null} />)

      await waitFor(() => {
        expect(screen.getByText("Movie not found!")).toBeInTheDocument()
      })
    })

    test("displays error when fetch throws exception", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"))

      render(<MoviePage movie={null} />)

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument()
      })
    })

    test("shows 'No movie selected' when no imdbID and no initial movie", async () => {
      // Mock useParams to return empty imdbID
      const { __setMockParams } = require("react-router-dom")
      __setMockParams({})

      render(<MoviePage movie={null} />)

      // Component should show "No movie selected" when no imdbID and no initial movie
      await waitFor(() => {
        expect(screen.getByText("No movie selected.")).toBeInTheDocument()
      })
    })
  })

  describe("Watched status", () => {
    test("shows 'Add to Watched' button when movie is not watched", async () => {
      isMovieWatched.mockResolvedValue({ watched: false })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })
    })

    test("shows 'Watched' button (disabled) when movie is already watched", async () => {
      isMovieWatched.mockResolvedValue({ watched: true })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        const watchedButton = screen.getByRole("button", { name: /watched/i })
        expect(watchedButton).toBeInTheDocument()
        expect(watchedButton).toBeDisabled()
      })
    })

    test("handles isMovieWatched error gracefully", async () => {
      isMovieWatched.mockResolvedValue({ error: new Error("Check failed") })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })
    })
  })

  describe("Adding to watched list", () => {
    test("successfully adds movie to watched list", async () => {
      addMovieToWatched.mockResolvedValue({
        movieId: 123,
        watched: [{ id: 1 }],
      })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })

      const addButton = screen.getByRole("button", { name: /add to watched/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText("Added to watched")).toBeInTheDocument()
      })

      await waitFor(() => {
        const watchedButton = screen.getByRole("button", { name: /watched/i })
        expect(watchedButton).toBeDisabled()
      })
    })

    test("shows 'Adding…' text while adding movie", async () => {
      addMovieToWatched.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ movieId: 123, watched: [{ id: 1 }] }),
              100
            )
          )
      )

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })

      const addButton = screen.getByRole("button", { name: /add to watched/i })
      fireEvent.click(addButton)

      expect(
        screen.getByRole("button", { name: /adding…/i })
      ).toBeInTheDocument()
    })

    test("displays error message when adding fails", async () => {
      addMovieToWatched.mockResolvedValue({
        error: new Error("Failed to add"),
      })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })

      const addButton = screen.getByRole("button", { name: /add to watched/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(
          screen.getByText("Failed to add movie to watched list")
        ).toBeInTheDocument()
      })
    })

    test("displays error when user is not signed in", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })

      const addButton = screen.getByRole("button", { name: /add to watched/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(
          screen.getByText("You must be signed in to add a watched movie.")
        ).toBeInTheDocument()
      })
    })

    test("handles exception when adding movie", async () => {
      addMovieToWatched.mockRejectedValue(new Error("Network failure"))

      render(<MoviePage movie={mockMovie} />)

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add to watched/i })
        ).toBeInTheDocument()
      })

      const addButton = screen.getByRole("button", { name: /add to watched/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText("Network failure")).toBeInTheDocument()
      })
    })
  })

  describe("Navigation", () => {
    test("calls navigate(-1) when Back button is clicked", () => {
      render(<MoviePage movie={mockMovie} />)

      const backButton = screen.getByRole("button", { name: /back/i })
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    test("calls custom onBack handler when provided", () => {
      const mockOnBack = jest.fn()
      render(<MoviePage movie={mockMovie} onBack={mockOnBack} />)

      const backButton = screen.getByRole("button", { name: /back/i })
      fireEvent.click(backButton)

      expect(mockOnBack).toHaveBeenCalledTimes(1)
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("Edge cases", () => {
    test("renders movie without optional fields", () => {
      const minimalMovie = {
        imdbID: "tt0111161",
        Title: "Test Movie",
        Year: "1994",
        Poster: null,
      }

      render(<MoviePage movie={minimalMovie} />)

      expect(screen.getByText("Test Movie (1994)")).toBeInTheDocument()
      expect(screen.queryByText("Plot:")).not.toBeInTheDocument()
      expect(screen.queryByText("Genre:")).not.toBeInTheDocument()
    })

    test("handles movie without year", () => {
      const movieWithoutYear = {
        ...mockMovie,
        Year: "",
      }

      render(<MoviePage movie={movieWithoutYear} />)

      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
    })

    test("handles null poster", () => {
      const movieWithNullPoster = {
        ...mockMovie,
        Poster: null,
      }

      render(<MoviePage movie={movieWithNullPoster} />)

      expect(screen.getByText("No Image")).toBeInTheDocument()
    })
  })
})
