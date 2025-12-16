import { searchByKeyword, fetchById, hasApiKey } from "./omdbApi"

// Mock fetch globally
global.fetch = jest.fn()

describe("omdbApi", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("hasApiKey", () => {
    test("returns true when API key is present", () => {
      expect(hasApiKey()).toBe(true)
    })
  })

  describe("searchByKeyword", () => {
    test("successfully searches for movies by keyword", async () => {
      const mockResponse = {
        Response: "True",
        Search: [
          {
            imdbID: "tt0111161",
            Title: "The Shawshank Redemption",
            Year: "1994",
            Type: "movie",
            Poster: "https://example.com/poster.jpg",
          },
        ],
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchByKeyword("Shawshank")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("s=Shawshank")
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("type=movie")
      )
      expect(result).toEqual(mockResponse)
    })

    test("includes page parameter in search request", async () => {
      const mockResponse = { Response: "True", Search: [] }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await searchByKeyword("test", 2)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2")
      )
    })

    test("throws error when API key is not configured", async () => {
      // Save original env
      const originalEnv = process.env.REACT_APP_OMDB_API_KEY

      // Temporarily unset the key
      delete process.env.REACT_APP_OMDB_API_KEY

      // Re-import to get the updated API_KEY value
      jest.resetModules()
      const { searchByKeyword: searchWithoutKey } = require("./omdbApi")

      await expect(searchWithoutKey("test")).rejects.toThrow(
        "OMDb API key not configured"
      )

      // Restore
      process.env.REACT_APP_OMDB_API_KEY = originalEnv
    })

    test("handles fetch failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(searchByKeyword("test")).rejects.toThrow("fetch failed 500")
    })

    test("encodes keyword in URL", async () => {
      const mockResponse = { Response: "True", Search: [] }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await searchByKeyword("star wars")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("star%20wars")
      )
    })
  })

  describe("fetchById", () => {
    test("successfully fetches movie by IMDb ID", async () => {
      const mockMovie = {
        imdbID: "tt0111161",
        Title: "The Shawshank Redemption",
        Year: "1994",
        Plot: "Two imprisoned men...",
        Response: "True",
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovie,
      })

      const result = await fetchById("tt0111161")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("i=tt0111161")
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("plot=short")
      )
      expect(result).toEqual(mockMovie)
    })

    test("throws error when API key is not configured", async () => {
      // Save original env
      const originalEnv = process.env.REACT_APP_OMDB_API_KEY

      // Temporarily unset the key
      delete process.env.REACT_APP_OMDB_API_KEY

      // Re-import to get the updated API_KEY value
      jest.resetModules()
      const { fetchById: fetchWithoutKey } = require("./omdbApi")

      await expect(fetchWithoutKey("tt0111161")).rejects.toThrow(
        "OMDb API key not configured"
      )

      // Restore
      process.env.REACT_APP_OMDB_API_KEY = originalEnv
    })

    test("handles fetch failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(fetchById("tt0000000")).rejects.toThrow("fetch failed 404")
    })

    test("encodes IMDb ID in URL", async () => {
      const mockMovie = { Response: "True", imdbID: "tt0111161" }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovie,
      })

      await fetchById("tt0111161")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("i=tt0111161")
      )
    })
  })
})
