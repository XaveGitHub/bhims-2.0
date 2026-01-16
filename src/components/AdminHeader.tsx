import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { useUserRole } from '../lib/auth'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import {
  LayoutDashboard,
  Settings,
  FileText,
  Shield,
  UserCog,
} from 'lucide-react'
import { UserButton } from '@clerk/tanstack-react-start'

export function AdminHeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}

function AdminHeader() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const userRole = useUserRole()

  // ✅ SIMPLIFIED: Dashboard contains everything (statistics + residents management)
  // Only show essential navigation items
  const menuItems = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'superadmin'] as const,
    },
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: Settings,
      roles: ['superadmin'] as const,
    },
    {
      title: 'Transactions',
      url: '/admin/transactions',
      icon: FileText,
      roles: ['superadmin'] as const,
    },
  ]

  // Filter menu items based on role
  const filteredMenuItems = userRole === undefined
    ? menuItems
    : menuItems.filter((item) => item.roles.includes(userRole as any))

  if (!authLoaded) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-600">BHIMS 2.0</span>
            <div className="w-8 h-8" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link to="/admin/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold text-blue-600">BHIMS 2.0</span>
            <span className="text-sm text-gray-600 hidden sm:inline">Admin</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.url || currentPath.startsWith(`${item.url}/`)
              
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-blue-700' : 'text-gray-500')} />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Account Button with Role Badge */}
          <div className="flex items-center gap-3">
            {userRole && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  userRole === 'superadmin' && 'bg-purple-50 text-purple-700 border-purple-200',
                  userRole === 'admin' && 'bg-blue-50 text-blue-700 border-blue-200'
                )}
              >
                {userRole === 'superadmin' && <Shield className="w-3 h-3 mr-1" />}
                {userRole === 'admin' && <UserCog className="w-3 h-3 mr-1" />}
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
