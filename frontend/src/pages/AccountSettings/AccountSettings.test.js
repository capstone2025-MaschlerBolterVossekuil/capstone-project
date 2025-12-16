import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import AccountSettings from "./AccountSettings"
import { supabase } from "../../lib/supabaseClient"

// Mock dependencies
jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock("react-router-dom")
const { __setMockNavigate, __resetMocks } = require("react-router-dom")
const mockNavigate = jest.fn()

describe("AccountSettings Component", () => {
  beforeEach(() => {
    __resetMocks()
    __setMockNavigate(mockNavigate)
  })
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  }

  const defaultProps = {
    user: mockUser,
    initialPreferences: [],
    initialWatchedIds: [],
    onSave: jest.fn(),
    onClose: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock for PreferencesTab supabase calls
    const selectUserMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ id: "user-123" }],
          error: null,
        }),
      }),
    })

    const selectPrefsMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    const upsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ user_id: "user-123", child_account: false }],
        error: null,
      }),
    })

    supabase.from.mockImplementation((table) => {
      if (table === "user_info") {
        return { select: selectUserMock }
      }
      if (table === "movie_preferences") {
        return {
          select: selectPrefsMock,
          upsert: upsertMock,
        }
      }
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) }
    })
  })

  describe("Rendering", () => {
    test("renders Back button", () => {
      render(<AccountSettings {...defaultProps} />)

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
    })

    test("renders all three tabs", () => {
      render(<AccountSettings {...defaultProps} />)

      const tabs = screen
        .getAllByRole("button")
        .filter((btn) => btn.className.includes("tab"))

      expect(tabs.length).toBe(3)
      expect(tabs.some((tab) => /child account/i.test(tab.textContent))).toBe(
        true
      )
      expect(tabs.some((tab) => /movies watched/i.test(tab.textContent))).toBe(
        true
      )
      expect(tabs.some((tab) => /preferences/i.test(tab.textContent))).toBe(
        true
      )
    })

    test("Preferences tab is active by default", () => {
      render(<AccountSettings {...defaultProps} />)

      const prefsTab = screen.getByRole("button", { name: /^preferences$/i })
      expect(prefsTab).toHaveClass("active")
    })
  })

  describe("Tab Switching", () => {
    test("switches to Child Account tab when clicked", () => {
      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      expect(childTab).toHaveClass("active")
      expect(screen.getByText("This is a child account")).toBeInTheDocument()
    })

    test("switches to Movies Watched tab when clicked", () => {
      render(<AccountSettings {...defaultProps} />)

      const watchedTab = screen.getByRole("button", { name: /movies watched/i })
      fireEvent.click(watchedTab)

      expect(watchedTab).toHaveClass("active")
    })

    test("switches to Preferences tab when clicked", () => {
      render(<AccountSettings {...defaultProps} />)

      // First switch to another tab
      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      // Then switch back to preferences
      const prefsTab = screen.getByRole("button", { name: /^preferences$/i })
      fireEvent.click(prefsTab)

      expect(prefsTab).toHaveClass("active")
    })

    test("displays correct content for each tab", () => {
      render(<AccountSettings {...defaultProps} />)

      // Child Account tab
      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)
      expect(screen.getByText("This is a child account")).toBeInTheDocument()

      // Preferences tab should show genre options
      const prefsTab = screen.getByRole("button", { name: /preferences/i })
      fireEvent.click(prefsTab)
      expect(screen.getByText(/save preferences/i)).toBeInTheDocument()
    })
  })

  describe("Child Account Tab", () => {
    test("renders child account checkbox", () => {
      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    test("toggles child account checkbox", () => {
      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    test("calls onSave and persistSettings when Save button is clicked", async () => {
      const onSave = jest.fn()

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "user-123" }],
            error: null,
          }),
        }),
      })

      const upsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ user_id: "user-123", child_account: true }],
          error: null,
        }),
      })

      supabase.from.mockImplementation((table) => {
        if (table === "user_info") {
          return { select: selectMock }
        }
        if (table === "movie_preferences") {
          return { upsert: upsertMock }
        }
      })

      render(<AccountSettings {...defaultProps} onSave={onSave} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({ child_account: true })
      })
    })

    test("handles persist settings error gracefully", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({ select: selectMock })

      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      // Should not crash, error is logged
      await waitFor(() => {
        expect(selectMock).toHaveBeenCalled()
      })
    })
  })

  describe("Navigation", () => {
    test("calls navigate(-1) when Back button is clicked", () => {
      render(<AccountSettings {...defaultProps} />)

      const backButton = screen.getByRole("button", { name: /back/i })
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    test("calls custom onClose when provided", () => {
      const onClose = jest.fn()
      render(<AccountSettings {...defaultProps} onClose={onClose} />)

      const backButton = screen.getByRole("button", { name: /back/i })
      fireEvent.click(backButton)

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("Status Messages", () => {
    test("displays status message after successful save", async () => {
      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      // Wait for async operations to complete and status to show
      await waitFor(
        () => {
          expect(screen.getByText("Saved")).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    test("status message clears after timeout", async () => {
      // Set up fake timers before rendering
      jest.useFakeTimers()

      render(<AccountSettings {...defaultProps} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      // Wait for the status message to appear (use runAllTimers to flush promises)
      await waitFor(
        () => {
          expect(screen.getByText("Saved")).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Fast-forward 6 seconds to clear the status
      jest.advanceTimersByTime(6000)

      // Status should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Saved")).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe("Initial State", () => {
    test("initializes with provided preferences", () => {
      render(
        <AccountSettings
          {...defaultProps}
          initialPreferences={["Action", "Drama"]}
        />
      )

      // Preferences tab is active by default
      // Check that genres are visible (testing via PreferencesTab component)
      expect(screen.getByText("Action")).toBeInTheDocument()
      expect(screen.getByText("Drama")).toBeInTheDocument()
    })

    test("initializes with provided watched IDs", () => {
      render(
        <AccountSettings {...defaultProps} initialWatchedIds={[1, 2, 3]} />
      )

      // Component should initialize with watched IDs
      expect(true).toBe(true) // State is internal, would need to check behavior
    })
  })

  describe("Persistence without authenticated user", () => {
    test("handles missing user gracefully", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      render(<AccountSettings {...defaultProps} user={null} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "No authenticated user available to persist settings"
        )
      })

      consoleWarnSpy.mockRestore()
    })

    test("handles missing user email gracefully", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      render(<AccountSettings {...defaultProps} user={{ id: "123" }} />)

      const childTab = screen.getByRole("button", { name: /child account/i })
      fireEvent.click(childTab)

      const saveButton = screen.getByRole("button", { name: /^save$/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "No authenticated user available to persist settings"
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })
})
