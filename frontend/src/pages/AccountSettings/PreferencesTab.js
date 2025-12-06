import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"

const DEFAULT_GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Romance",
  "Horror",
  "Thriller",
  "Family",
  "Animation",
  "Documentary",
]

export default function PreferencesTab({
  initial = [],
  onSave = () => {},
  user = null,
}) {
  const [selected, setSelected] = useState(new Set(initial))

  useEffect(() => {
    let mounted = true

    async function loadPrefs() {
      // If a user is provided, try to resolve their user_info row by email
      if (!user || !user.email) {
        // fallback to provided initial
        setSelected(new Set(initial))
        return
      }

      try {
        const { data: users, error: userFindErr } = await supabase
          .from("user_info")
          .select("id")
          .eq("email", user.email)
          .limit(1)

        if (userFindErr) {
          console.warn(
            "Failed to find user_info for preferences load:",
            userFindErr
          )
          setSelected(new Set(initial))
          return
        }

        const userRow = Array.isArray(users) ? users[0] : users
        if (!userRow || !userRow.id) {
          setSelected(new Set(initial))
          return
        }

        const { data: prefs, error: prefsErr } = await supabase
          .from("movie_preferences")
          .select("preferences")
          .eq("user_id", userRow.id)
          .limit(1)

        if (prefsErr) {
          console.warn("Failed to load movie_preferences:", prefsErr)
          setSelected(new Set(initial))
          return
        }

        const prefRow = Array.isArray(prefs) ? prefs[0] : prefs
        if (!prefRow || prefRow.preferences == null) {
          setSelected(new Set(initial))
          return
        }

        let parsed = prefRow.preferences

        // If stored as a JSON string, attempt to parse
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed)
          } catch (e) {
            // not JSON, keep as-is
          }
        }

        // If the DB stored an object with a specific key, adapt as needed.
        // Here we expect an array like ["Action","Comedy"]
        const arr = Array.isArray(parsed) ? parsed : initial

        if (mounted) setSelected(new Set(arr || []))
      } catch (e) {
        console.warn("Error loading preferences:", e)
        setSelected(new Set(initial))
      }
    }

    loadPrefs()
    return () => {
      mounted = false
    }
  }, [user, initial])

  function toggle(g) {
    const copy = new Set(selected)
    if (copy.has(g)) copy.delete(g)
    else copy.add(g)
    setSelected(copy)
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {DEFAULT_GENRES.map((g) => (
          <label
            key={g}
            style={{
              border: "1px solid #ddd",
              padding: "6px 10px",
              borderRadius: 6,
              cursor: "pointer",
              background: selected.has(g) ? "#2563eb" : "#fff",
              color: selected.has(g) ? "#fff" : "#111",
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(g)}
              onChange={() => toggle(g)}
              style={{ marginRight: 8 }}
            />
            {g}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="primary"
          onClick={() => onSave(Array.from(selected))}
        >
          Save Preferences
        </button>
      </div>
    </div>
  )
}
