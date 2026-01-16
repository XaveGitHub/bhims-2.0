import { useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Clock } from 'lucide-react'

export const Route = createFileRoute('/pending-approval')({
  component: PendingApprovalPage,
})

function PendingApprovalPage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  
  // ✅ COST OPTIMIZED: Server-side beforeLoad ensures auth, but still skip query if not signed in
  // This is a safety check and follows the same pattern as other routes
  const userRole = useQuery(
    api.users.getUserRole,
    isSignedIn ? {} : 'skip'
  )

  // ✅ OPTIMIZED: Single useEffect handles all redirects
  // Server-side beforeLoad already ensures user is authenticated,
  // so we only need to check role and handle redirects
  useEffect(() => {
    // Wait for auth and role to load
    if (!authLoaded || userRole === undefined) return

    // If not signed in (shouldn't happen due to beforeLoad, but handle gracefully)
    if (!isSignedIn) {
      navigate({ to: '/' })
      return
    }

    // If role is assigned (no longer null), redirect to appropriate dashboard
    if (userRole !== null) {
      if (userRole === 'staff') {
        navigate({ to: '/staff/queue' })
      } else if (userRole === 'admin' || userRole === 'superadmin') {
        navigate({ to: '/admin/dashboard' })
      }
    }
  }, [authLoaded, isSignedIn, userRole, navigate])

  // Show loading while checking auth/role
  if (!authLoaded || userRole === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not signed in or role exists, will redirect (handled in useEffect)
  // This page only shows when role is null (pending approval)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-4xl font-bold mb-4">Pending Approval</h1>
        <p className="text-gray-600 mb-2">
          Your account is pending administrator approval.
        </p>
        <p className="text-gray-600">
          Please contact your administrator to activate your account.
        </p>
      </div>
    </div>
  )
}
