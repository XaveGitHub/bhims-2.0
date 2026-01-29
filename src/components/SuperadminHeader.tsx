import { Link } from '@tanstack/react-router'
import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from './ui/breadcrumb'

export function SuperadminHeader() {
  return (
    <header
      className="flex h-16 shrink-0 items-center gap-2 border-b px-4"
      style={{
        height: "var(--header-height)",
      }}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link to="/superadmin/dashboard">
                Superadmin
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
