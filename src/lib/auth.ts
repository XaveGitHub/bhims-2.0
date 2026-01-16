/**
 * Route protection utilities for BHIMS
 * Handles authentication and role-based access control
 */

import { useAuth } from '@clerk/tanstack-react-start'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export type UserRole = 'staff' | 'admin' | 'superadmin' | null

/**
 * Hook to get current user role from Convex
 * Returns: role | null (pending approval) | undefined (loading)
 * 
 * ✅ COST OPTIMIZED: Only queries when user is signed in
 * ✅ SAFETY: Only queries when auth is loaded to prevent ctx.auth errors
 * Convex automatically caches this query across all components
 */
export function useUserRole(): UserRole | undefined {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  
  // ✅ SAFETY: Only query Convex if auth is loaded AND user is signed in
  // Prevents queries from running before auth token is ready (prevents ctx.auth errors)
  // Convex caches this query, so multiple components share the same result
  return useQuery(
    api.users.getUserRole,
    authLoaded && isSignedIn ? {} : 'skip'
  )
}

/**
 * Hook to check if user has required role(s)
 * @param allowedRoles - Array of roles that can access the route
 * @returns Object with authorization state
 */
export function useRequireRole(allowedRoles: UserRole[]) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const userRole = useUserRole()

  const isAuthorized =
    authLoaded &&
    isSignedIn &&
    userRole !== undefined &&
    userRole !== null &&
    allowedRoles.includes(userRole)

  const isPending =
    authLoaded && isSignedIn && userRole !== undefined && userRole === null

  const isLoading = !authLoaded || userRole === undefined

  return {
    isAuthorized,
    isPending,
    isLoading,
    userRole,
    isSignedIn: isSignedIn ?? false,
  }
}

/**
 * Check if a role has permission to access another role's resources
 * Higher roles can access lower role resources
 */
export function hasRolePermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  if (!userRole || !requiredRole) return false

  const roleHierarchy: Record<string, number> = {
    staff: 1,
    admin: 2,
    superadmin: 3,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user is admin or superadmin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'superadmin'
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(userRole: UserRole): boolean {
  return userRole === 'superadmin'
}
