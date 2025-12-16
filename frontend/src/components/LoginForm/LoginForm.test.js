import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import LoginForm from "./LoginForm"
import { supabase } from "../../lib/supabaseClient"
import { saveProfileAndPreferences } from "../../lib/profileApi"

// Mock dependencies
jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

jest.mock("../../lib/profileApi", () => ({
  saveProfileAndPreferences: jest.fn(),
}))

describe("LoginForm Component", () => {
  let mockOnLogin

  beforeEach(() => {
    mockOnLogin = jest.fn()
    jest.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe("Sign In Mode", () => {
    test("renders sign in form by default", () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /sign in/i })
      ).toBeInTheDocument()
      expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument()
    })

    test("does not render first name and last name fields in sign in mode", () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      expect(
        screen.queryByPlaceholderText("First name")
      ).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText("Last name")).not.toBeInTheDocument()
    })

    test("validates required email field", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText("Email is required")).toBeInTheDocument()
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test("validates email format", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      fireEvent.change(emailInput, { target: { value: "invalidemail" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText("Enter a valid email")).toBeInTheDocument()
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test("validates required password field", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      fireEvent.change(emailInput, { target: { value: "test@example.com" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("Password is required")
      ).toBeInTheDocument()
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test("validates password minimum length", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "12345" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("Password must be at least 6 characters")
      ).toBeInTheDocument()
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    test("successfully signs in with valid credentials", async () => {
      const mockUser = { id: "123", email: "test@example.com" }
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        })
      })

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(mockUser)
      })
    })

    test("displays error message on sign in failure", async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: "Invalid login credentials" },
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "wrongpassword" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("Invalid login credentials")
      ).toBeInTheDocument()
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    test("shows loading state during sign in", async () => {
      let resolveSignIn
      supabase.auth.signInWithPassword.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve
        })
      )

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(screen.getByText("Signing in…")).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      resolveSignIn({
        data: { user: { email: "test@example.com" } },
        error: null,
      })

      await waitFor(() => {
        expect(screen.queryByText("Signing in…")).not.toBeInTheDocument()
      })
    })

    test("applies pending profile from localStorage after sign in", async () => {
      const mockUser = { id: "123", email: "test@example.com" }
      const pendingProfile = {
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
      }

      localStorage.setItem("pending_profile", JSON.stringify(pendingProfile))

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      saveProfileAndPreferences.mockResolvedValue({ error: null })

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(saveProfileAndPreferences).toHaveBeenCalledWith({
          email: "test@example.com",
          first_name: "John",
          last_name: "Doe",
        })
      })

      expect(localStorage.getItem("pending_profile")).toBeNull()
    })

    test("handles error when applying pending profile", async () => {
      const mockUser = { id: "123", email: "test@example.com" }
      const pendingProfile = {
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
      }

      localStorage.setItem("pending_profile", JSON.stringify(pendingProfile))

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      saveProfileAndPreferences.mockResolvedValue({
        error: { message: "Profile save failed" },
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText(/signed in, but saving profile failed/i)
      ).toBeInTheDocument()
    })
  })

  describe("Sign Up Mode", () => {
    test("switches to sign up mode when button clicked", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const signUpButton = screen.getByRole("button", { name: /sign up/i })
      fireEvent.click(signUpButton)

      expect(screen.getByPlaceholderText("First name")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /^sign up$/i })
      ).toBeInTheDocument()
      expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument()
    })

    test("validates first name in sign up mode", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("First name is required")
      ).toBeInTheDocument()
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    test("validates last name in sign up mode", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "John" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("Last name is required")
      ).toBeInTheDocument()
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    test("successfully signs up with valid data", async () => {
      const mockUser = { id: "123", email: "newuser@example.com" }
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      saveProfileAndPreferences.mockResolvedValue({ error: null })

      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "Jane" } })
      fireEvent.change(lastNameInput, { target: { value: "Smith" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: "newuser@example.com",
          password: "password123",
        })
      })

      await waitFor(() => {
        expect(saveProfileAndPreferences).toHaveBeenCalledWith({
          email: "newuser@example.com",
          first_name: "Jane",
          last_name: "Smith",
        })
      })

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(mockUser)
      })
    })

    test("handles sign up requiring email confirmation", async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null }, // No user object when confirmation required
        error: null,
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "Jane" } })
      fireEvent.change(lastNameInput, { target: { value: "Smith" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText(/check your email to confirm your account/i)
      ).toBeInTheDocument()

      // Should save to localStorage
      const pendingProfile = JSON.parse(
        localStorage.getItem("pending_profile") || "{}"
      )
      expect(pendingProfile).toEqual({
        email: "newuser@example.com",
        first_name: "Jane",
        last_name: "Smith",
      })

      // Should switch back to sign in mode
      expect(
        screen.getByRole("button", { name: /^sign in$/i })
      ).toBeInTheDocument()
    })

    test("displays error message on sign up failure", async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: "Email already registered" },
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, {
        target: { value: "existing@example.com" },
      })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "Jane" } })
      fireEvent.change(lastNameInput, { target: { value: "Smith" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText("Email already registered")
      ).toBeInTheDocument()
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    test("shows loading state during sign up", async () => {
      let resolveSignUp
      supabase.auth.signUp.mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve
        })
      )

      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "Jane" } })
      fireEvent.change(lastNameInput, { target: { value: "Smith" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(screen.getByText("Signing up…")).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      resolveSignUp({
        data: { user: { email: "newuser@example.com" } },
        error: null,
      })

      await waitFor(() => {
        expect(screen.queryByText("Signing up…")).not.toBeInTheDocument()
      })
    })

    test("handles profile save error during sign up", async () => {
      const mockUser = { id: "123", email: "newuser@example.com" }
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      saveProfileAndPreferences.mockResolvedValue({
        error: { message: "Database error" },
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "Jane" } })
      fireEvent.change(lastNameInput, { target: { value: "Smith" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(
        await screen.findByText(/signed up, but saving profile failed/i)
      ).toBeInTheDocument()
    })
  })

  describe("Mode Switching", () => {
    test("clears error and info messages when switching modes", async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      })

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "wrongpass" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()

      // Switch to sign up mode
      const switchButton = screen.getByRole("button", { name: /sign up/i })
      fireEvent.click(switchButton)

      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument()
    })

    test("switches back to sign in from sign up mode", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      // Switch to sign up mode
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))
      expect(screen.getByPlaceholderText("First name")).toBeInTheDocument()

      // Switch back to sign in
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
      expect(
        screen.queryByPlaceholderText("First name")
      ).not.toBeInTheDocument()
      expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument()
    })
  })

  describe("Input Updates", () => {
    test("updates email input value", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      fireEvent.change(emailInput, { target: { value: "test@example.com" } })

      expect(emailInput).toHaveValue("test@example.com")
    })

    test("updates password input value", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      const passwordInput = screen.getByPlaceholderText("••••••••")
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      expect(passwordInput).toHaveValue("password123")
    })

    test("updates first name input value in sign up mode", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const firstNameInput = screen.getByPlaceholderText("First name")
      fireEvent.change(firstNameInput, { target: { value: "John" } })

      expect(firstNameInput).toHaveValue("John")
    })

    test("updates last name input value in sign up mode", async () => {
      render(<LoginForm onLogin={mockOnLogin} />)

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const lastNameInput = screen.getByPlaceholderText("Last name")
      fireEvent.change(lastNameInput, { target: { value: "Doe" } })

      expect(lastNameInput).toHaveValue("Doe")
    })
  })

  describe("Edge Cases", () => {
    test("handles exception during sign in", async () => {
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error("Network error")
      )

      render(<LoginForm onLogin={mockOnLogin} />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText("Network error")).toBeInTheDocument()
    })

    test("handles exception during sign up", async () => {
      supabase.auth.signUp.mockRejectedValue(new Error("Server error"))

      render(<LoginForm onLogin={mockOnLogin} />)

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")
      const firstNameInput = screen.getByPlaceholderText("First name")
      const lastNameInput = screen.getByPlaceholderText("Last name")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.change(firstNameInput, { target: { value: "John" } })
      fireEvent.change(lastNameInput, { target: { value: "Doe" } })

      const submitButton = screen.getByRole("button", { name: /^sign up$/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText("Server error")).toBeInTheDocument()
    })

    test("does not call onLogin if it is not provided", async () => {
      const mockUser = { id: "123", email: "test@example.com" }
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      render(<LoginForm />)

      const emailInput = screen.getByPlaceholderText("you@example.com")
      const passwordInput = screen.getByPlaceholderText("••••••••")

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalled()
      })
    })
  })
})
