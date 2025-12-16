import React from "react"

// Mock window.location for navigation
let mockPathname = "/"
let mockNavigate = jest.fn((path, options) => {
  mockPathname = path
})
let mockParams = {}

// Helper to get current pathname (from window.location or mock)
const getCurrentPathname = () => {
  return (
    (typeof window !== "undefined" && window.location?.pathname) || mockPathname
  )
}

export const Link = ({ children, to, ...props }) => {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  )
}

export const BrowserRouter = ({ children }) => <div>{children}</div>

export const Routes = ({ children }) => {
  // Find the matching route based on current pathname
  const pathname = getCurrentPathname()
  const childArray = React.Children.toArray(children)

  for (const child of childArray) {
    if (!child.props) continue

    const path = child.props.path
    const element = child.props.element

    // Match exact paths or wildcards
    if (
      path === pathname ||
      (path === "*" && !childArray.some((c) => c.props.path === pathname)) ||
      (path && path.includes(":") && pathname.startsWith(path.split(":")[0]))
    ) {
      return <div>{element}</div>
    }
  }

  return <div />
}

export const Route = () => null

export const Navigate = ({ to, replace }) => {
  // Update mock pathname when Navigate is rendered
  React.useEffect(() => {
    mockPathname = to
  }, [to])
  return null
}

export const useNavigate = () => {
  return mockNavigate
}

export const useParams = () => {
  // If mockParams is set, use it; otherwise extract from pathname
  if (Object.keys(mockParams).length > 0) {
    return mockParams
  }

  const pathname = getCurrentPathname()
  // Simple param extraction for /movie/:imdbID pattern
  if (pathname.startsWith("/movie/")) {
    return { imdbID: pathname.replace("/movie/", "") }
  }
  return {}
}

export const useLocation = () => ({
  pathname: getCurrentPathname(),
  search: "",
  hash: "",
  state: null,
})

// Helpers to configure mocks between tests
export const __setMockPathname = (path) => {
  mockPathname = path
}

export const __setMockNavigate = (fn) => {
  mockNavigate = fn
}

export const __setMockParams = (params) => {
  mockParams = params
}

export const __resetMocks = () => {
  mockPathname = "/"
  mockNavigate = jest.fn((path, options) => {
    mockPathname = path
  })
  mockParams = {}
}

export const MemoryRouter = ({ children }) => <div>{children}</div>
