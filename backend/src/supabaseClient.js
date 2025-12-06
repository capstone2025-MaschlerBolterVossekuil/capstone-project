import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signupProfile(profile) {
  const { email, first_name, last_name } = profile || {}
  if (!email) {
    return { error: new Error("Email is required") }
  }

  // Insert into user_info. We store the email and name fields.
  const { data: userData, error: insertUserError } = await supabase
    .from("user_info")
    .insert([
      {
        user_name: email,
        first_name: first_name || null,
        last_name: last_name || null,
        email,
      },
    ])
    .select("id")
    .limit(1)

  if (insertUserError) {
    return { error: insertUserError }
  }

  const createdUser = Array.isArray(userData) ? userData[0] : userData
  if (!createdUser || !createdUser.id) {
    return { error: new Error("Could not create user_info row") }
  }

  // Create an associated movie_preferences row for the new user.
  const { data: prefData, error: insertPrefError } = await supabase
    .from("movie_preferences")
    .insert([
      {
        user_id: createdUser.id,
        child_account: false,
        movies_watched_id: null,
        preferences: JSON.stringify({}),
      },
    ])
    .select()

  if (insertPrefError) {
    // Attempt to cleanup the created user_info row? For now, return error and include created user id.
    return { userInfo: createdUser, error: insertPrefError }
  }

  return { userInfo: createdUser, moviePreferences: prefData }
}
