import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import App from "./App"
import { supabase } from "./lib/supabaseClient"
import { __setMockPathname } from "./__mocks__/react-router-dom"

// Mock dependencies
jest.mock("./lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

// Mock fetch for OMDb API
global.fetch = jest.fn()

describe("App Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __setMockPathname("/")
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })
  })

  describe("Initial Rendering", () => {
    test("restores user session on mount", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Response: "False" }),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText("Movies")).toBeInTheDocument()
      })
    })
  })

  describe("Login Flow", () => {
    test("signs out user when sign out button is clicked", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      supabase.auth.signOut.mockResolvedValue({})

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Response: "False" }),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument()
      })

      const signOutButton = screen.getByRole("button", { name: /sign out/i })
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled()
      })
    })

    test("handles sign out error gracefully", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      supabase.auth.signOut.mockRejectedValue(new Error("Sign out failed"))

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Response: "False" }),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument()
      })

      const signOutButton = screen.getByRole("button", { name: /sign out/i })
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Sign out failed",
          expect.any(Error)
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })

  describe("Routing", () => {
    test("renders home page when user is authenticated", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Response: "False" }),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText("Movies")).toBeInTheDocument()
        expect(screen.getByText("test@example.com")).toBeInTheDocument()
      })
    })
  })

  describe("API Key Configuration", () => {
    test("uses environment API key when available", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: "True",
          Search: [],
        }),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText("Movies")).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText("Search OMDb...")
      const searchForm = searchInput.closest("form")

      fireEvent.change(searchInput, { target: { value: "test" } })
      fireEvent.submit(searchForm)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("apikey=")
        )
      })
    })
  })
})
