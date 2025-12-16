import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import MovieCard from "./MovieCard"

describe("MovieCard Component", () => {
  const mockMovieWithPoster = {
    imdbID: "tt0111161",
    Title: "The Shawshank Redemption",
    Year: "1994",
    Type: "movie",
    Poster: "https://example.com/poster.jpg",
  }

  const mockMovieWithoutPoster = {
    imdbID: "tt0068646",
    Title: "The Godfather",
    Year: "1972",
    Type: "movie",
    Poster: "N/A",
  }

  const mockMovieNullPoster = {
    imdbID: "tt0468569",
    Title: "The Dark Knight",
    Year: "2008",
    Type: "movie",
    Poster: null,
  }

  describe("Rendering", () => {
    test("renders movie title", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
    })

    test("renders movie year", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      expect(screen.getByText("1994")).toBeInTheDocument()
    })

    test("renders movie type", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      expect(screen.getByText("movie")).toBeInTheDocument()
    })

    test("renders movie poster when available", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      const poster = screen.getByAltText("The Shawshank Redemption poster")
      expect(poster).toBeInTheDocument()
      expect(poster).toHaveAttribute("src", "https://example.com/poster.jpg")
    })

    test("renders placeholder when poster is 'N/A'", () => {
      render(<MovieCard movie={mockMovieWithoutPoster} />)
      expect(screen.getByText("No Image")).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    test("renders placeholder when poster is null", () => {
      render(<MovieCard movie={mockMovieNullPoster} />)
      expect(screen.getByText("No Image")).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    test("renders with empty type gracefully", () => {
      const movieNoType = { ...mockMovieWithPoster, Type: undefined }
      render(<MovieCard movie={movieNoType} />)
      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
    })
  })

  describe("Click Interaction", () => {
    test("calls onClick handler when clicked", async () => {
      const mockOnClick = jest.fn()

      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      fireEvent.click(card)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(mockMovieWithPoster)
    })

    test("does not set button role when onClick is not provided", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    test("does not throw error when clicked without onClick handler", async () => {
      render(<MovieCard movie={mockMovieWithPoster} />)

      const card = screen.getByText("The Shawshank Redemption").closest("div")
      fireEvent.click(card)

      // No error should be thrown
    })

    test("handles multiple clicks correctly", async () => {
      const mockOnClick = jest.fn()

      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      fireEvent.click(card)
      fireEvent.click(card)
      fireEvent.click(card)

      expect(mockOnClick).toHaveBeenCalledTimes(3)
    })
  })

  describe("Keyboard Interaction", () => {
    test("triggers onClick when Enter key is pressed", async () => {
      const mockOnClick = jest.fn()

      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()
      fireEvent.keyDown(card, { key: "Enter" })

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(mockMovieWithPoster)
    })

    test("triggers onClick when Space key is pressed", async () => {
      const mockOnClick = jest.fn()

      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()
      fireEvent.keyDown(card, { key: " " })

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(mockMovieWithPoster)
    })

    test("does not trigger onClick for other keys", async () => {
      const mockOnClick = jest.fn()

      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()
      fireEvent.keyDown(card, { key: "Escape" })
      fireEvent.keyDown(card, { key: "a" })
      fireEvent.keyDown(card, { key: "Tab" })

      expect(mockOnClick).not.toHaveBeenCalled()
    })

    test("handles Enter key press correctly", () => {
      const mockOnClick = jest.fn()
      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()

      // Simulate Enter key press - the component should call onClick
      fireEvent.keyDown(card, { key: "Enter" })

      // Verify onClick was called
      expect(mockOnClick).toHaveBeenCalledWith(mockMovieWithPoster)
    })

    test("handles Space key press correctly", () => {
      const mockOnClick = jest.fn()
      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()

      // Simulate Space key press - the component should call onClick
      fireEvent.keyDown(card, { key: " " })

      // Verify onClick was called
      expect(mockOnClick).toHaveBeenCalledWith(mockMovieWithPoster)
    })

    test("does not set onKeyDown when onClick is not provided", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)

      const card = screen.getByText("The Shawshank Redemption").closest("div")
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      })

      // Should not throw error
      fireEvent.keyDown(card, event)
    })
  })

  describe("Accessibility", () => {
    test("sets tabIndex to 0 when onClick is provided", () => {
      const mockOnClick = jest.fn()
      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      expect(card).toHaveAttribute("tabIndex", "0")
    })

    test("does not set tabIndex when onClick is not provided", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)

      const card = screen.getByText("The Shawshank Redemption").closest("div")
      expect(card).not.toHaveAttribute("tabIndex")
    })

    test("has correct aria-label when onClick is provided", () => {
      const mockOnClick = jest.fn()
      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      expect(card).toHaveAttribute(
        "aria-label",
        "Open The Shawshank Redemption"
      )
    })

    test("does not have aria-label when onClick is not provided", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)

      const card = screen.getByText("The Shawshank Redemption").closest("div")
      expect(card).not.toHaveAttribute("aria-label")
    })

    test("image has proper alt text", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)

      const image = screen.getByAltText("The Shawshank Redemption poster")
      expect(image).toBeInTheDocument()
    })

    test("is keyboard focusable when onClick is provided", () => {
      const mockOnClick = jest.fn()
      render(<MovieCard movie={mockMovieWithPoster} onClick={mockOnClick} />)

      const card = screen.getByRole("button")
      card.focus()

      expect(card).toHaveFocus()
    })
  })

  describe("CSS Classes", () => {
    test("has movie-card class", () => {
      render(<MovieCard movie={mockMovieWithPoster} />)
      const card = screen
        .getByText("The Shawshank Redemption")
        .closest(".movie-card")
      expect(card).toBeInTheDocument()
    })

    test("has movie-poster class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const poster = container.querySelector(".movie-poster")
      expect(poster).toBeInTheDocument()
    })

    test("has movie-info class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const info = container.querySelector(".movie-info")
      expect(info).toBeInTheDocument()
    })

    test("has movie-title class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const title = container.querySelector(".movie-title")
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent("The Shawshank Redemption")
    })

    test("has movie-meta class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const meta = container.querySelector(".movie-meta")
      expect(meta).toBeInTheDocument()
    })

    test("has movie-release class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const release = container.querySelector(".movie-release")
      expect(release).toBeInTheDocument()
      expect(release).toHaveTextContent("1994")
    })

    test("has movie-type class", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)
      const type = container.querySelector(".movie-type")
      expect(type).toBeInTheDocument()
      expect(type).toHaveTextContent("movie")
    })

    test("has movie-placeholder class when no poster", () => {
      const { container } = render(<MovieCard movie={mockMovieWithoutPoster} />)
      const placeholder = container.querySelector(".movie-placeholder")
      expect(placeholder).toBeInTheDocument()
      expect(placeholder).toHaveTextContent("No Image")
    })
  })

  describe("Edge Cases", () => {
    test("handles very long movie titles", () => {
      const longTitleMovie = {
        ...mockMovieWithPoster,
        Title:
          "This is a Very Long Movie Title That Could Potentially Break the Layout If Not Handled Properly",
      }
      render(<MovieCard movie={longTitleMovie} />)
      expect(
        screen.getByText(
          "This is a Very Long Movie Title That Could Potentially Break the Layout If Not Handled Properly"
        )
      ).toBeInTheDocument()
    })

    test("handles special characters in title", () => {
      const specialCharMovie = {
        ...mockMovieWithPoster,
        Title: 'Movie: The & Special <Characters> "Test"',
      }
      render(<MovieCard movie={specialCharMovie} />)
      expect(
        screen.getByText('Movie: The & Special <Characters> "Test"')
      ).toBeInTheDocument()
    })

    test("handles empty year", () => {
      const noYearMovie = { ...mockMovieWithPoster, Year: "" }
      render(<MovieCard movie={noYearMovie} />)
      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
    })

    test("handles missing Type field", () => {
      const noTypeMovie = { ...mockMovieWithPoster }
      delete noTypeMovie.Type
      render(<MovieCard movie={noTypeMovie} />)
      expect(screen.getByText("The Shawshank Redemption")).toBeInTheDocument()
    })

    test("handles poster URL with spaces", () => {
      const spacePosterMovie = {
        ...mockMovieWithPoster,
        Poster: "https://example.com/poster with spaces.jpg",
      }
      render(<MovieCard movie={spacePosterMovie} />)
      const image = screen.getByAltText("The Shawshank Redemption poster")
      expect(image).toHaveAttribute(
        "src",
        "https://example.com/poster with spaces.jpg"
      )
    })
  })

  describe("Component Structure", () => {
    test("renders all main sections", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)

      const card = container.querySelector(".movie-card")
      const poster = container.querySelector(".movie-poster")
      const info = container.querySelector(".movie-info")
      const meta = container.querySelector(".movie-meta")

      expect(card).toBeInTheDocument()
      expect(poster).toBeInTheDocument()
      expect(info).toBeInTheDocument()
      expect(meta).toBeInTheDocument()
    })

    test("maintains correct DOM hierarchy", () => {
      const { container } = render(<MovieCard movie={mockMovieWithPoster} />)

      const card = container.querySelector(".movie-card")
      const poster = card?.querySelector(".movie-poster")
      const info = card?.querySelector(".movie-info")
      const title = info?.querySelector(".movie-title")
      const meta = info?.querySelector(".movie-meta")

      expect(poster).toBeInTheDocument()
      expect(info).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(meta).toBeInTheDocument()
    })
  })
})
