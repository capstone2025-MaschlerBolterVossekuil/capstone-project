import React, { useState } from "react"
import "./AccountSettings.css"
import MoviesWatchedTab from "./MoviesWatchedTab"
import { useNavigate } from "react-router-dom"
import PreferencesTab from "./PreferencesTab"
import { supabase } from "../../lib/supabaseClient"

export default function AccountSettings({
  user,
  initialPreferences = [],
  initialWatchedIds = [],
  onSave = () => {},
  onClose = null,
}) {
  const [status, setStatus] = useState("")
  const [active, setActive] = useState("prefs")
  const [childAccount, setChildAccount] = useState(false)
  const [watchedIds, setWatchedIds] = useState(initialWatchedIds || [])
  const [preferences, setPreferences] = useState(initialPreferences || [])
  const navigate = useNavigate()
  const close = onClose || (() => navigate(-1))

  function handleSaveChild() {
    onSave({ child_account: childAccount })
    persistSettings({ child_account: childAccount })
    // feedback could be added
  }

  function handleSaveWatched(newIds) {
    setWatchedIds(newIds)
    onSave({ movies_watched_id: newIds })
    persistSettings({ movies_watched_id: newIds })
  }

  function handleSavePreferences(newPrefs) {
    setPreferences(newPrefs)
    onSave({ preferences: JSON.stringify(newPrefs) })
    persistSettings({ preferences: JSON.stringify(newPrefs) })
  }

  async function persistSettings(payload) {
    // payload may include: child_account (bool), movies_watched_id (array or int), preferences (string)
    if (!user || !user.email) {
      console.warn("No authenticated user available to persist settings")
      return
    }
    try {
      // Resolve the user's `user_info` row
      const { data: users, error: userFindErr } = await supabase
        .from("user_info")
        .select("id")
        .eq("email", user.email)
        .limit(1)

      if (userFindErr) throw userFindErr
      const userRow = Array.isArray(users) ? users[0] : users
      if (!userRow || !userRow.id) throw new Error("user_info row not found")

      // Upsert into movie_preferences for this user
      const upsertBody = {
        user_id: userRow.id,
        child_account: payload.child_account ?? false,
        movies_watched_id: payload.movies_watched_id ?? null,
        preferences: payload.preferences ?? null,
      }

      const { data: prefData, error: prefErr } = await supabase
        .from("movie_preferences")
        .upsert([upsertBody], { onConflict: "user_id" })
        .select()

      if (prefErr) throw prefErr
      setStatus("Saved")
    } catch (err) {
      console.warn("Error persisting account settings:", err)
      setStatus(
        "Error persisting account settings: " +
          (err?.message || JSON.stringify(err))
      )
    }
  }

  // Clear status shortly after showing
  React.useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(""), 6000)
    return () => clearTimeout(t)
  }, [status])

  return (
    <div className="account-settings">
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}
      >
        <button onClick={close} style={{ padding: "6px 10px" }}>
          Back
        </button>
      </div>
      {status && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: 8,
            background: status.includes("Error") ? "#fee" : "#efe",
            color: status.includes("Error") ? "#c00" : "#060",
            borderRadius: 4,
          }}
        >
          {status}
        </div>
      )}
      <div className="tabs">
        <button
          className={active === "child" ? "tab active" : "tab"}
          onClick={() => setActive("child")}
        >
          Child Account
        </button>
        <button
          className={active === "watched" ? "tab active" : "tab"}
          onClick={() => setActive("watched")}
        >
          Movies Watched
        </button>
        <button
          className={active === "prefs" ? "tab active" : "tab"}
          onClick={() => setActive("prefs")}
        >
          Preferences
        </button>
      </div>

      <div className="tab-panel">
        {active === "child" && (
          <div className="child-panel">
            <label className="child-row">
              <input
                type="checkbox"
                checked={childAccount}
                onChange={(e) => setChildAccount(e.target.checked)}
              />
              <span style={{ marginLeft: 8 }}>This is a child account</span>
            </label>
            <div style={{ marginTop: 12 }}>
              <button onClick={handleSaveChild} className="primary">
                Save
              </button>
            </div>
          </div>
        )}

        {active === "watched" && (
          <MoviesWatchedTab user={user} onSave={handleSaveWatched} />
        )}

        {active === "prefs" && (
          <PreferencesTab
            initial={preferences}
            onSave={handleSavePreferences}
            user={user}
          />
        )}
      </div>
    </div>
  )
}
