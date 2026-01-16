import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { RouteGuard } from '@/lib/route-guards'
import { AdminHeaderLayout } from '@/components/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, BarChart3, Clock, Search, Plus, MoreVertical, Edit, Trash2, Eye, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['admin', 'superadmin']}>
      <AdminDashboardContent />
    </RouteGuard>
  )
}

function AdminDashboardContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  
  // ✅ SAFETY: Only query when auth is loaded and user is signed in
  // This prevents queries from running before auth token is ready (prevents ctx.auth errors)
  const shouldSkipQuery = !authLoaded || !isSignedIn
  const stats = useQuery(
    api.statistics.getDashboardStats,
    shouldSkipQuery ? 'skip' : {}
  )

  // Loading state - wait for auth to load first
  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  // Loading state - query is loading
  if (stats === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state - query returned null (auth error or unauthorized)
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Failed to load statistics</p>
          <p className="text-sm text-gray-500">Please refresh the page or contact support if the issue persists.</p>
        </div>
      </div>
    )
  }

  return (
    <AdminHeaderLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Resident Management & Statistics</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Residents Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.residents.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Active residents</p>
            </CardContent>
          </Card>

          {/* Population Breakdown Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Population Breakdown</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Male</span>
                  <span className="text-lg font-semibold">{stats.residents.male.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Female</span>
                  <span className="text-lg font-semibold">{stats.residents.female.toLocaleString()}</span>
                </div>
                {stats.residents.other > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Other</span>
                    <span className="text-lg font-semibold">{stats.residents.other.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Queue Volume Today Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Volume Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queue.today}</div>
              <p className="text-xs text-muted-foreground mt-1">Requests processed today</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Statistics (Superadmin only) */}
        {'sales' in stats && stats.sales && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(stats.sales.totalRevenue / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(stats.sales.revenueThisMonth / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current month</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Residents Management Section */}
        <ResidentsManagementSection />
        </div>
      </div>
    </AdminHeaderLayout>
  )
}

// Residents Management Component
function ResidentsManagementSection() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all') // ✅ NEW: Gender filter
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [residentToDelete, setResidentToDelete] = useState<string | null>(null)

  const PAGE_SIZE = 50 // ✅ OPTIMIZED: 50 records per page

  // ✅ OPTIMIZED: Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, zoneFilter, genderFilter])

  const shouldSkipQuery = !authLoaded || !isSignedIn
  const offset = (currentPage - 1) * PAGE_SIZE

  // ✅ OPTIMIZED: Query residents with all filters (server-side: status, zone, gender)
  const residents = useQuery(
    api.residents.list,
    shouldSkipQuery
      ? 'skip'
      : {
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
          zone: zoneFilter !== 'all' ? zoneFilter : undefined,
          gender: genderFilter !== 'all' ? (genderFilter as any) : undefined,
          limit: PAGE_SIZE,
          offset: offset,
        }
  )

  // ✅ OPTIMIZED: Search query with debouncing (only queries after user stops typing)
  const searchResults = useQuery(
    api.residents.search,
    shouldSkipQuery || !debouncedSearchTerm.trim()
      ? 'skip'
      : {
          searchTerm: debouncedSearchTerm.trim(),
          limit: PAGE_SIZE,
        }
  )

  const deleteResident = useMutation(api.residents.remove)

  // Determine which data to display
  const displayResidents = useMemo((): Doc<'residents'>[] => {
    if (debouncedSearchTerm.trim()) {
      return (searchResults as Doc<'residents'>[]) || []
    }
    return (residents as Doc<'residents'>[]) || []
  }, [debouncedSearchTerm, searchResults, residents])

  // ✅ OPTIMIZED: Client-side filtering only for search results (when using search)
  // For list queries, filtering is done server-side via Convex
  const filteredResidents = useMemo(() => {
    // If using search, apply client-side filters
    if (debouncedSearchTerm.trim()) {
      let filtered = displayResidents
      if (statusFilter !== 'all') {
        filtered = filtered.filter((r: Doc<'residents'>) => r.status === statusFilter)
      }
      if (zoneFilter !== 'all') {
        filtered = filtered.filter((r: Doc<'residents'>) => r.zone === zoneFilter)
      }
      return filtered
    }
    // For list queries, server-side filtering is already applied
    return displayResidents
  }, [displayResidents, statusFilter, zoneFilter, debouncedSearchTerm])

  // Calculate pagination info
  const hasMore = filteredResidents.length === PAGE_SIZE

  const handleDelete = async () => {
    if (!residentToDelete) return
    try {
      await deleteResident({ id: residentToDelete as any })
      toast.success('Resident deleted successfully')
      setDeleteDialogOpen(false)
      setResidentToDelete(null)
    } catch (error) {
      toast.error('Failed to delete resident')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resident':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'deceased':
        return 'destructive'
      case 'moved':
        return 'outline'
      default:
        return 'outline'
    }
  }

  if (!authLoaded) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Residents Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage resident records, search, filter, and view profiles
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Resident
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="resident">Resident</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="deceased">Deceased</SelectItem>
              <SelectItem value="moved">Moved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {/* Zones would be dynamically loaded - placeholder for now */}
              <SelectItem value="Zone 1">Zone 1</SelectItem>
              <SelectItem value="Zone 2">Zone 2</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Residents Table */}
        {residents === undefined || (debouncedSearchTerm && searchResults === undefined) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {debouncedSearchTerm ? 'No residents found matching your search' : 'No residents found'}
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResidents.map((resident: any) => (
                    <TableRow key={resident._id}>
                      <TableCell className="font-mono text-sm">
                        {resident.residentId}
                      </TableCell>
                      <TableCell>
                        {resident.firstName} {resident.middleName} {resident.lastName}
                      </TableCell>
                      <TableCell>{resident.zone}</TableCell>
                      <TableCell className="capitalize">{resident.sex}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(resident.status)}>
                          {resident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate({ to: `/admin/residents/${resident._id}` })}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setResidentToDelete(resident._id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ✅ Pagination Controls */}
            {!debouncedSearchTerm && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {offset + 1} to {Math.min(offset + PAGE_SIZE, (residents?.length || 0) + offset)} of residents
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Resident</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this resident? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
