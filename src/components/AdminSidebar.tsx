import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { useUserRole } from '../lib/auth'
import { cn } from '../lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
} from './ui/sidebar'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Badge } from './ui/badge'
import { Shield, UserCog } from 'lucide-react'

export function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  )
}

function AdminSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  
  // ✅ SAFETY: Only query role when auth is loaded and user is signed in
  // This prevents queries from running before auth token is ready (prevents ctx.auth errors)
  // useUserRole already handles this, but we check here for UI state
  const userRole = useUserRole()
  
  // Show loading state if auth isn't ready yet
  if (!authLoaded) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-4">
          <span className="text-lg font-bold text-blue-600">BHIMS 2.0</span>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        </SidebarContent>
      </Sidebar>
    )
  }

  // ✅ SIMPLIFIED: Dashboard contains everything (statistics + residents management)
  // Only show essential navigation items
  const menuItems = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'superadmin'] as const,
      description: 'Statistics & Residents Management',
    },
    // Removed: Residents (merged into dashboard)
    // Removed: Statistics (merged into dashboard)
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
  // If role is still loading (undefined), show all items to prevent flickering
  // Once role loads, filter appropriately
  const filteredMenuItems = userRole === undefined
    ? menuItems // Show all while loading
    : menuItems.filter((item) => item.roles.includes(userRole as any))

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/admin/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <span className="text-lg font-bold text-blue-600">BHIMS 2.0</span>
          <span className="text-xs text-gray-500 hidden lg:inline">Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.url || currentPath.startsWith(`${item.url}/`)
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-4">
        <div className="flex flex-col gap-3">
          {/* User Info Section */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
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
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </div>
          {/* Home Link */}
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            ← Back to Home
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
