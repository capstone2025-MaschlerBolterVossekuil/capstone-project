const API_KEY = process.env.REACT_APP_OMDB_API_KEY || ""
const BASE = "https://www.omdbapi.com/"

// Runtime check: log whether the API key was embedded into the client bundle.
// This logs only presence (true/false) and will NOT print the key value.
try {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("OMDb API key present:", Boolean(API_KEY))
  }
} catch (e) {
  // ignore
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed ${res.status}`)
  return res.json()
}

export async function searchByKeyword(keyword, page = 1) {
  if (!API_KEY)
    throw new Error("OMDb API key not configured (REACT_APP_OMDB_API_KEY)")
  const url = `${BASE}?apikey=${API_KEY}&s=${encodeURIComponent(
    keyword
  )}&type=movie&page=${page}`
  return fetchJson(url)
}

export async function fetchById(imdbID) {
  if (!API_KEY)
    throw new Error("OMDb API key not configured (REACT_APP_OMDB_API_KEY)")
  const url = `${BASE}?apikey=${API_KEY}&i=${encodeURIComponent(
    imdbID
  )}&plot=short`
  return fetchJson(url)
}

export function hasApiKey() {
  return Boolean(API_KEY)
}

export default { searchByKeyword, fetchById, hasApiKey }
