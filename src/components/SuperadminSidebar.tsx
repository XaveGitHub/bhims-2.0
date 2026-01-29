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
  SidebarInset,
} from './ui/sidebar'
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Shield,
} from 'lucide-react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Badge } from './ui/badge'

export function SuperadminSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SuperadminSidebar variant="inset" />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

function SuperadminSidebar({ variant }: { variant?: "sidebar" | "floating" | "inset" }) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { isLoaded: authLoaded } = useAuth()
  const userRole = useUserRole()
  
  if (!authLoaded) {
    return (
      <Sidebar variant={variant}>
        <SidebarHeader className="border-b px-4 py-4">
          <span className="text-lg font-bold text-purple-600">BHIMS 2.0</span>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        </SidebarContent>
      </Sidebar>
    )
  }

  const menuItems = [
    {
      title: 'Dashboard',
      url: '/superadmin/dashboard',
      icon: LayoutDashboard,
      description: 'Statistics & Residents Management',
    },
    {
      title: 'Statistics',
      url: '/superadmin/statistics',
      icon: Users,
      description: 'Detailed Reports & Analytics',
    },
    {
      title: 'Settings',
      url: '/superadmin/settings',
      icon: Settings,
      description: 'Document Types & Services',
    },
    {
      title: 'Transactions',
      url: '/superadmin/transactions',
      icon: FileText,
      description: 'All Document Requests',
    },
  ]

  return (
    <Sidebar variant={variant}>
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/superadmin/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-lg font-bold text-purple-600">BHIMS 2.0</span>
          <span className="text-xs text-gray-500 hidden lg:inline">Superadmin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {userRole && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Superadmin
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
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
