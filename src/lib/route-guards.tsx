/**
 * Route guard components for protecting routes by role
 * Usage in route components to handle authentication and authorization
 * 
 * SECURITY NOTES:
 * - This is CLIENT-SIDE protection (UX layer)
 * - Convex queries/mutations are protected server-side via JWT validation (automatic)
 * - All data access is protected: Convex validates Clerk JWT tokens server-side
 * - RouteGuard provides UX (redirects, loading states) and role-based routing
 * 
 * SECURITY ARCHITECTURE:
 * 1. Convex JWT Validation: All queries/mutations validate Clerk JWT tokens server-side
 *    - If no valid token → ctx.auth.getUserIdentity() returns null
 *    - All functions check getCurrentUser(ctx) which validates authentication
 *    - This is the PRIMARY security layer (cannot be bypassed)
 * 2. Client-side RouteGuard: Provides UX and role-based routing
 *    - Redirects unauthenticated users to /login
 *    - Redirects pending approval users to /pending-approval
 *    - Redirects unauthorized roles to home
 *    - This is a UX layer (data is already protected by Convex)
 */

import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useRequireRole, type UserRole } from './auth'

interface RouteGuardProps {
  allowedRoles: UserRole[]
  redirectTo?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * RouteGuard component - Protects routes by requiring authentication and specific roles
 * Automatically redirects unauthorized users
 * 
 * OPTIMIZED: Single useEffect to handle all redirects, reducing re-renders
 */
export function RouteGuard({
  allowedRoles,
  redirectTo = '/login',
  children,
  fallback,
}: RouteGuardProps) {
  const navigate = useNavigate()
  const { isAuthorized, isPending, isLoading, isSignedIn } = useRequireRole(
    allowedRoles
  )

  // ✅ OPTIMIZED: Single useEffect handles all redirects
  // Reduces re-renders and ensures redirect priority is correct
  useEffect(() => {
    // Wait for auth state to load
    if (isLoading) return

    // Priority 1: Not signed in → redirect to login
    if (!isSignedIn) {
      navigate({ to: redirectTo })
      return
    }

    // Priority 2: Pending approval → redirect to pending page
    if (isPending) {
      navigate({ to: '/pending-approval' })
      return
    }

    // Priority 3: Not authorized (wrong role) → redirect to home
    if (!isAuthorized) {
      navigate({ to: '/' })
    }
  }, [isLoading, isSignedIn, isPending, isAuthorized, navigate, redirectTo])

  // While loading, render nothing (let page handle its own loading state)
  // The check is fast since beforeLoad already handles auth
  if (isLoading) {
    return fallback ?? null
  }

  // Show pending approval state (will redirect via useEffect)
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Render children only if authorized
  if (isAuthorized) {
    return <>{children}</>
  }

  // Not authorized (will redirect via useEffect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}

/**
 * Higher-order component for route protection
 * Usage: export default withRouteGuard(MyComponent, ['admin', 'superadmin'])
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  redirectTo?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard allowedRoles={allowedRoles} redirectTo={redirectTo}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}
