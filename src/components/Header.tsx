import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { useUserRole } from '../lib/auth'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import {
  LayoutDashboard,
  Shield,
  UserCog,
} from 'lucide-react'

export default function Header() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  // ✅ COST OPTIMIZED: Fast path checks first (before any hooks/queries)
  const publicPaths = ['/', '/login', '/kiosk', '/queue-display']
  
  // Hide header on public pages and admin pages (admin uses sidebar instead)
  if (publicPaths.includes(currentPath) || currentPath.startsWith('/admin')) {
    return null
  }

  // ✅ OPTIMIZATION: Check if route needs auth before calling hooks
  // Protected route prefixes that require authentication
  const protectedRoutePrefixes = ['/staff', '/admin']
  const knownProtectedRoutes = ['/pending-approval']
  const isProtectedRoute = protectedRoutePrefixes.some(prefix => 
    currentPath.startsWith(prefix)
  )
  const isKnownProtectedRoute = isProtectedRoute || knownProtectedRoutes.includes(currentPath)

  // ✅ SAFETY: Only call useAuth() if we might need it
  // React hooks must be called consistently, but useAuth() is lightweight (just reads context)
  const { isSignedIn } = useAuth()

  // Hide header if:
  // 1. Protected route but user not authenticated (will be redirected)
  // 2. Unknown route and not authenticated (likely 404)
  if ((isProtectedRoute || !isKnownProtectedRoute) && !isSignedIn) {
    return null
  }

  // ✅ OPTIMIZATION: Only query role when header is definitely being shown
  // useUserRole already skips Convex query if not signed in
  const userRole = useUserRole()

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold text-blue-600">BHIMS 2.0</span>
            <span className="text-sm text-gray-600 hidden sm:inline">
              Barangay Handumanan
            </span>
          </Link>

          {/* Navigation - Only show for authenticated users */}
          {/* Hide admin navigation on admin pages (sidebar handles it) */}
          <SignedIn>
            {!currentPath.startsWith('/admin') && (
              <nav className="flex items-center space-x-1">
                {/* Staff Navigation */}
                {userRole === 'staff' && (
                  <NavLinkWithIcon 
                    to="/staff/queue" 
                    currentPath={currentPath}
                    icon={LayoutDashboard}
                  >
                    Queue
                  </NavLinkWithIcon>
                )}
              </nav>
            )}
          </SignedIn>

          {/* User Account Button with Role Badge */}
          <SignedIn>
            <div className="flex items-center gap-3">
              {/* Role Badge - Beside UserButton */}
              {userRole && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium",
                    userRole === 'superadmin' && "bg-purple-50 text-purple-700 border-purple-200",
                    userRole === 'admin' && "bg-blue-50 text-blue-700 border-blue-200",
                    userRole === 'staff' && "bg-green-50 text-green-700 border-green-200"
                  )}
                >
                  {userRole === 'superadmin' && <Shield className="w-3 h-3 mr-1" />}
                  {userRole === 'admin' && <UserCog className="w-3 h-3 mr-1" />}
                  {userRole === 'staff' && <UserCog className="w-3 h-3 mr-1" />}
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Badge>
              )}
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </div>
          </SignedIn>

          {/* Show nothing for signed out users on protected pages (they'll be redirected) */}
          <SignedOut>
            <div className="w-8 h-8" /> {/* Spacer for layout */}
          </SignedOut>
        </div>
      </div>
    </header>
  )
}

interface NavLinkWithIconProps {
  to: string
  currentPath: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function NavLinkWithIcon({ to, currentPath, icon: Icon, children }: NavLinkWithIconProps) {
  const isActive = currentPath === to || currentPath.startsWith(`${to}/`)
  
  return (
    <Link
      to={to}
      className={cn(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <Icon className={cn('w-4 h-4', isActive ? 'text-blue-700' : 'text-gray-500')} />
      <span>{children}</span>
    </Link>
  )
}

