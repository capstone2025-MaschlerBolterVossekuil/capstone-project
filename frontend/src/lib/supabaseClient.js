import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
// Support both the common anon key name and the publishable/default key name
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase URL or ANON/Publishable KEY not set. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY (or REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY) in frontend/.env"
  )
}

export const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || ""
)
