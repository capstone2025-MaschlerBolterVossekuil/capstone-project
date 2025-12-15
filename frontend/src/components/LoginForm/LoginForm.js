import React, { useState } from "react"
import "./LoginForm.css"
import { supabase } from "../../lib/supabaseClient"
import { saveProfileAndPreferences } from "../../lib/profileApi"

export default function LoginForm({ onLogin }) {
  const [mode, setMode] = useState("signin") // 'signin' or 'signup'
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!email) return "Email is required"
    if (!email.includes("@")) return "Enter a valid email"
    if (!password) return "Password is required"
    if (password.length < 6) return "Password must be at least 6 characters"
    if (mode === "signup") {
      if (!firstName) return "First name is required"
      if (!lastName) return "Last name is required"
    }
    return ""
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError("")
    setInfo("")
    setLoading(true)
    try {
      if (mode === "signin") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })
        if (signInError) {
          setError(signInError.message || "Sign in failed")
        } else {
          // successful sign-in
          onLogin && onLogin(data.user || { email })

          // If there is a pending profile saved during signup (email confirmation flow), try to apply it now.
          try {
            const pendingRaw = localStorage.getItem("pending_profile")
            if (pendingRaw && data?.user) {
              const pending = JSON.parse(pendingRaw)
              if (pending.email === data.user.email) {
                // Apply pending profile via backend API (backend will insert or update user_info)
                try {
                  const result = await saveProfileAndPreferences({
                    email: data.user.email,
                    first_name: pending.first_name,
                    last_name: pending.last_name,
                  })
                  if (result.error) {
                    console.warn("saveProfile error:", result.error)
                    setError(
                      "Signed in, but saving profile failed: " +
                        (result.error.message || JSON.stringify(result.error))
                    )
                  } else {
                    localStorage.removeItem("pending_profile")
                  }
                } catch (err) {
                  console.warn("Error applying pending profile:", err)
                  setError(
                    "Signed in, but saving profile failed: " +
                      (err.message || err)
                  )
                }
              }
            }
          } catch (applyErr) {
            console.warn("Error applying pending profile:", applyErr)
          }
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
          setError(signUpError.message || "Sign up failed")
        } else {
          try {
            if (data?.user) {
              // Create profile via backend API
              try {
                const result = await saveProfileAndPreferences({
                  email: data.user.email || email,
                  first_name: firstName,
                  last_name: lastName,
                })
                if (result.error) {
                  console.warn("profile insert error:", result.error)
                  setError(
                    "Signed up, but saving profile failed: " +
                      (result.error.message || JSON.stringify(result.error))
                  )
                }
              } catch (err) {
                console.warn("Error saving profile data:", err)
                setError(
                  "Signed up, but saving profile failed: " +
                    (err.message || err)
                )
              }
              onLogin && onLogin(data.user)
            } else {
              // If signup requires email confirmation, a user object may not be returned.
              // Save the profile temporarily to localStorage so it can be applied after the user confirms and signs in.
              try {
                const pending = {
                  email,
                  first_name: firstName,
                  last_name: lastName,
                }
                localStorage.setItem("pending_profile", JSON.stringify(pending))
              } catch (err) {
                console.warn(
                  "Could not save pending profile to localStorage:",
                  err
                )
              }
              setInfo(
                "Sign-up successful. Check your email to confirm your account before signing in. Your profile will be saved once you sign in."
              )
              setMode("signin")
            }
          } catch (profileErr) {
            console.warn("Error saving profile data:", profileErr)
            setError(
              "Error saving profile data: " +
                (profileErr.message || JSON.stringify(profileErr))
            )
          }
        }
      }
    } catch (err) {
      setError(
        err.message || (mode === "signin" ? "Sign in failed" : "Sign up failed")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="loginCard" onSubmit={handleSubmit}>
      {mode === "signup" && (
        <>
          <label className="label">
            First name
            <input
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </label>

          <label className="label">
            Last name
            <input
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </label>
        </>
      )}
      <label className="label">
        Email
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="label">
        Password
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <button className="primary" type="submit" disabled={loading}>
        {loading
          ? mode === "signin"
            ? "Signing in…"
            : "Signing up…"
          : mode === "signin"
          ? "Sign in"
          : "Sign up"}
      </button>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        {mode === "signin" ? (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup")
                setError("")
                setInfo("")
              }}
              style={{
                color: "#2563eb",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signin")
                setError("")
                setInfo("")
              }}
              style={{
                color: "#2563eb",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  )
}
