import { useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({ component: HomePage })

/**
 * Public Landing Page
 * 
 * Shows barangay logo for unauthenticated users.
 * Redirects authenticated users to their role-based dashboard.
 * 
 * This is a public page - no authentication required.
 * Each role has its own dedicated route (e.g., /staff/queue, /admin/dashboard).
 */
function HomePage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  
  // ✅ COST OPTIMIZED: Only query when signed in
  // Prevents unnecessary Convex query for unauthenticated users
  const userRole = useQuery(
    api.users.getUserRole,
    isSignedIn ? {} : 'skip'
  )

  // Redirect authenticated users to their role-based dashboard
  useEffect(() => {
    if (!authLoaded) return

    // If not signed in, show landing page (no redirect)
    if (!isSignedIn) return

    // Wait for role to load
    if (userRole === undefined) return

    // Redirect based on role to dedicated routes
    if (userRole === null) {
      navigate({ to: '/pending-approval' })
    } else if (userRole === 'staff') {
      navigate({ to: '/staff/queue' })
    } else if (userRole === 'admin') {
      navigate({ to: '/admin/dashboard' })
    } else if (userRole === 'superadmin') {
      navigate({ to: '/superadmin/dashboard' })
    }
  }, [authLoaded, isSignedIn, userRole, navigate])

  // Show loading while checking auth
  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show logo page if not logged in (public landing page)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          {/* Barangay logo placeholder */}
          <div className="mb-6">
            <div className="w-32 h-32 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🏛️</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-700">Barangay Handumanan</h1>
        </div>
      </div>
    )
  }

  // Show redirecting message while checking role (authenticated users)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
