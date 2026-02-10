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
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Badge } from './ui/badge'
import { Shield, UserCog } from 'lucide-react'

export function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

function AdminSidebar({ variant }: { variant?: "sidebar" | "floating" | "inset" }) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { isLoaded: authLoaded } = useAuth()
  const userRole = useUserRole()
  
  if (!authLoaded) {
    return (
      <Sidebar variant={variant}>
        <SidebarHeader className="border-b px-4 py-4">
          <span className="text-lg font-bold text-blue-600">BHIMS 2.0</span>
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
      url: '/admin/dashboard',
      icon: LayoutDashboard,
      description: 'Statistics & Overview',
    },
    {
      title: 'Residents',
      url: '/admin/residents',
      icon: Users,
      description: 'Manage Resident Records',
    },
  ]

  return (
    <Sidebar variant={variant}>
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/admin/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <UserCog className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-bold text-blue-600">BHIMS 2.0</span>
          <span className="text-xs text-gray-500 hidden lg:inline">Admin</span>
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
                  className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200"
                >
                  <UserCog className="w-3 h-3 mr-1" />
                  Admin
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
