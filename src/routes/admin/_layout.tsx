import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RouteGuard } from '@/lib/route-guards'
import { AdminSidebarLayout } from '@/components/AdminSidebar'

export const Route = createFileRoute('/admin/_layout')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <AdminSidebarLayout>
        <Outlet />
      </AdminSidebarLayout>
    </RouteGuard>
  )
}
