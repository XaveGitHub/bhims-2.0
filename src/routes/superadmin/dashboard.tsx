import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { RouteGuard } from '@/lib/route-guards'
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
import { Users, BarChart3, Clock, Search, Plus, MoreVertical, Edit, Trash2, Eye, Upload, ChevronLeft, ChevronRight, Save, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'
import { format } from 'date-fns'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SuperadminSidebarLayout } from '@/components/SuperadminSidebar'
import { SuperadminHeader } from '@/components/SuperadminHeader'

export const Route = createFileRoute('/superadmin/dashboard')({
  component: SuperadminDashboardPage,
  // Delay showing loading spinner to allow cached data to display first
  // pendingMs: 200 means wait 200ms before showing loading state
  // pendingMinMs: 100 means show loading for at least 100ms once it appears
  pendingMs: 200,
  pendingMinMs: 100,
  pendingComponent: () => (
    <SuperadminSidebarLayout>
      <SuperadminHeader />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          </div>
        </div>
      </div>
    </SuperadminSidebarLayout>
  ),
})

function SuperadminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['superadmin']}>
      <SuperadminSidebarLayout>
        <SuperadminHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <SuperadminDashboardContent />
            </div>
          </div>
        </div>
      </SuperadminSidebarLayout>
    </RouteGuard>
  )
}

function SuperadminDashboardContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  
  // ✅ OPTIMIZED: Only skip query when auth is loaded AND user is not signed in
  // This allows Convex to use cached data during navigation transitions
  // Don't skip when auth is still loading - Convex can handle it and use cache
  const shouldSkipQuery = authLoaded && !isSignedIn
  const stats = useQuery(
    api.statistics.getDashboardStats,
    shouldSkipQuery ? 'skip' : {}
  )

  // Only show loading spinner on true initial load (when auth is not loaded AND no cached data)
  // This prevents showing loading spinner on every navigation
  const isInitialLoad = !authLoaded && stats === undefined
  
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state - query returned null (auth error or unauthorized)
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Failed to load statistics</p>
          <p className="text-xs text-muted-foreground">Please refresh the page or contact support if the issue persists.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resident Management & Statistics</p>
      </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {/* Pending Resident Confirmations Section */}
        <PendingResidentConfirmationsSection />

        {/* Residents Management Section */}
        <ResidentsManagementSection />
    </>
  )
}

// Import shared components from admin dashboard
// We'll need to copy these components or import them
// For now, let's copy the essential parts

// Pending Resident Card Component (separate to use hooks properly)
function PendingResidentCard({
  resident,
  onApprove,
  onReject,
}: {
  resident: Doc<'residents'>
  onApprove: () => void
  onReject: () => void
}) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  // ✅ OPTIMIZED: Only skip query when auth is loaded AND user is not signed in
  const shouldSkipQuery = authLoaded && !isSignedIn

  // Check duplicates for this resident
  const duplicates = useQuery(
    api.residents.checkDuplicates,
    shouldSkipQuery
      ? 'skip'
      : {
          firstName: resident.firstName,
          lastName: resident.lastName,
          birthdate: resident.birthdate,
          excludeId: resident._id,
        }
  )

  const hasDuplicates = duplicates && duplicates.length > 0

  return (
    <Card
      className={`border-2 ${
        hasDuplicates ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'
      }`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">
                {resident.firstName} {resident.middleName} {resident.lastName}
                {(resident as any).suffix && ` ${(resident as any).suffix}`}
              </h3>
              {hasDuplicates && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Possible Duplicate
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Resident ID:</span>
                <p className="font-medium">{resident.residentId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Purok:</span>
                <p className="font-medium">{resident.purok}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Birthday:</span>
                <p className="font-medium">
                  {format(new Date(resident.birthdate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Gender:</span>
                <p className="font-medium capitalize">{resident.sex}</p>
              </div>
            </div>

            {/* Duplicate Warnings */}
            {hasDuplicates && duplicates && (
              <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Potential Duplicate Found:
                </p>
                <div className="space-y-2">
                  {duplicates.slice(0, 3).map((dup, idx) => (
                    <div
                      key={idx}
                      className="text-sm bg-white p-2 rounded border border-amber-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {dup.resident.firstName} {dup.resident.middleName}{' '}
                            {dup.resident.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {dup.resident.residentId} •{' '}
                            {format(new Date(dup.resident.birthdate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            dup.confidence === 'high'
                              ? 'destructive'
                              : dup.confidence === 'medium'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {dup.confidence} match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{dup.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Pending Resident Confirmations Component
function PendingResidentConfirmationsSection() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [residentToApprove, setResidentToApprove] = useState<Doc<'residents'> | null>(null)
  const [residentToReject, setResidentToReject] = useState<Doc<'residents'> | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const shouldSkipQuery = !authLoaded || !isSignedIn
  
  // Get all pending residents
  const pendingResidents = useQuery(
    api.residents.listByStatus,
    shouldSkipQuery ? 'skip' : { status: 'pending', limit: 100 }
  )

  const approvePending = useMutation(api.residents.approvePending)
  const rejectPending = useMutation(api.residents.rejectPending)

  const refreshQueries = () => {
    // Convex queries will automatically refetch when mutations complete
  }

  const handleApprove = async () => {
    if (!residentToApprove || isApproving) return
    setIsApproving(true)
    try {
      await approvePending({ id: residentToApprove._id })
      toast.success('Resident approved successfully')
      setApproveDialogOpen(false)
      setResidentToApprove(null)
      refreshQueries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve resident')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!residentToReject || isRejecting) return
    setIsRejecting(true)
    try {
      await rejectPending({ id: residentToReject._id })
      toast.success('Pending resident rejected and removed')
      setRejectDialogOpen(false)
      setResidentToReject(null)
      refreshQueries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject resident')
    } finally {
      setIsRejecting(false)
    }
  }

  if (!authLoaded || pendingResidents === undefined) {
    return null // Don't show loading, just hide section
  }

  // Don't show section if no pending residents
  if (!pendingResidents || pendingResidents.length === 0) {
    return null
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Resident Confirmations
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingResidents.length} guest record{pendingResidents.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingResidents.map((resident) => (
            <PendingResidentCard
              key={resident._id}
              resident={resident}
              onApprove={() => {
                setResidentToApprove(resident)
                setApproveDialogOpen(true)
              }}
              onReject={() => {
                setResidentToReject(resident)
                setRejectDialogOpen(true)
              }}
            />
          ))}
        </div>

        {/* Approve Confirmation Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Resident</DialogTitle>
              <DialogDescription>
                {residentToApprove && (
                  <>
                    Approve{' '}
                    <strong>
                      {residentToApprove.firstName} {residentToApprove.middleName}{' '}
                      {residentToApprove.lastName}
                    </strong>{' '}
                    and assign a proper Resident ID? This will convert the guest record to a full
                    resident.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setApproveDialogOpen(false)
                  setResidentToApprove(null)
                }}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Pending Resident</DialogTitle>
              <DialogDescription>
                {residentToReject && (
                  <>
                    Are you sure you want to reject{' '}
                    <strong>
                      {residentToReject.firstName} {residentToReject.middleName}{' '}
                      {residentToReject.lastName}
                    </strong>
                    ? This will permanently delete the pending record. This action cannot be undone.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false)
                  setResidentToReject(null)
                }}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Residents Management Component - Copy from admin dashboard but update routes
function ResidentsManagementSection() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [residentToDelete, setResidentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [residentToEdit, setResidentToEdit] = useState<Doc<'residents'> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshQueries = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const PAGE_SIZE = 50

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, genderFilter])

  // ✅ OPTIMIZED: Only skip query when auth is loaded AND user is not signed in
  const shouldSkipQuery = authLoaded && !isSignedIn
  const offset = (currentPage - 1) * PAGE_SIZE

  const residents = useQuery(
    api.residents.list,
    shouldSkipQuery
      ? 'skip'
      : {
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
          gender: genderFilter !== 'all' ? (genderFilter as any) : undefined,
          limit: PAGE_SIZE,
          offset: offset,
          _refreshKey: refreshKey,
        }
  )

  const searchResults = useQuery(
    api.residents.search,
    shouldSkipQuery || !debouncedSearchTerm.trim()
      ? 'skip'
      : {
          searchTerm: debouncedSearchTerm.trim(),
          limit: PAGE_SIZE,
          _refreshKey: refreshKey,
        }
  )

  const deleteResident = useMutation(api.residents.remove)
  const createResident = useMutation(api.residents.create)
  const updateResident = useMutation(api.residents.update)

  const displayResidents = useMemo((): Doc<'residents'>[] => {
    if (debouncedSearchTerm.trim()) {
      return (searchResults as Doc<'residents'>[]) || []
    }
    return (residents as Doc<'residents'>[]) || []
  }, [debouncedSearchTerm, searchResults, residents])

  const filteredResidents = useMemo(() => {
    if (debouncedSearchTerm.trim()) {
      let filtered = displayResidents
      if (statusFilter !== 'all') {
        filtered = filtered.filter((r: Doc<'residents'>) => r.status === statusFilter)
      }
      return filtered
    }
    return displayResidents
  }, [displayResidents, statusFilter, debouncedSearchTerm])

  const hasMore = filteredResidents.length === PAGE_SIZE

  const handleDelete = async () => {
    if (!residentToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteResident({ id: residentToDelete as any })
      toast.success('Resident deleted successfully')
      setDeleteDialogOpen(false)
      setResidentToDelete(null)
      refreshQueries()
    } catch (error) {
      toast.error('Failed to delete resident')
    } finally {
      setIsDeleting(false)
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
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
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
                    <TableHead>Purok</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResidents.map((resident: any) => (
                    <TableRow 
                      key={resident._id}
                      className="cursor-pointer hover:bg-gray-50 group"
                      onClick={() => navigate({ to: `/superadmin/residents/${resident._id}` })}
                    >
                      <TableCell className="font-mono text-sm group-hover:underline">
                        {resident.residentId}
                      </TableCell>
                      <TableCell className="group-hover:underline">
                        {resident.firstName} {resident.middleName} {resident.lastName}
                        {(resident as any).suffix && ` ${(resident as any).suffix}`}
                      </TableCell>
                      <TableCell className="group-hover:underline">{resident.purok}</TableCell>
                      <TableCell className="capitalize group-hover:underline">{resident.sex}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(resident.status)}>
                          {resident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate({ to: `/superadmin/residents/${resident._id}` })}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResidentToEdit(resident)
                                setEditDialogOpen(true)
                              }}
                            >
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

            {/* Pagination Controls */}
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

        {/* Add Resident Dialog */}
        <AddResidentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onCreate={async (args) => {
            await createResident(args)
            refreshQueries()
          }}
        />

        {/* Edit Resident Dialog */}
        {residentToEdit && (
          <EditResidentDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            resident={residentToEdit}
            onUpdate={async (args) => {
              await updateResident(args)
              refreshQueries()
            }}
            onClose={() => setResidentToEdit(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(newOpen) => {
            if (!isDeleting) {
              setDeleteDialogOpen(newOpen)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Resident</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this resident? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Helper function to calculate age from timestamp
function calculateAge(birthdate: number): number {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Add Resident Dialog Component

function AddResidentDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (args: any) => Promise<any>
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm({
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      sex: 'male' as 'male' | 'female' | 'other',
      birthdate: '',
      purok: '',
      seniorOrPwd: 'none' as 'none' | 'senior' | 'pwd' | 'both',
      status: 'resident' as 'resident' | 'pending' | 'deceased' | 'moved',
    },
    validators: {
      onSubmit: ({ value }) => {
        const errors: Record<string, string> = {}
        if (!value.firstName?.trim()) errors.firstName = 'First name is required'
        if (!value.lastName?.trim()) errors.lastName = 'Last name is required'
        if (!value.birthdate) errors.birthdate = 'Birthdate is required'
        if (!value.purok?.trim()) errors.purok = 'Purok is required'
        return Object.keys(errors).length > 0 ? errors : undefined
      },
    },
    onSubmit: async ({ value }) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        const birthdateTimestamp = new Date(value.birthdate).getTime()
        await onCreate({
          firstName: value.firstName,
          middleName: value.middleName,
          lastName: value.lastName,
          suffix: value.suffix || undefined,
          sex: value.sex,
          birthdate: birthdateTimestamp,
          purok: value.purok,
          seniorOrPwd: value.seniorOrPwd,
          status: value.status,
        })
        toast.success('Resident created successfully')
        form.reset()
        // Close dialog after successful creation
        setTimeout(() => {
          onOpenChange(false)
        }, 100)
      } catch (error: any) {
        toast.error(error.message || 'Failed to create resident')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing dialog during submission
        if (!form.state.isSubmitting) {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Resident</DialogTitle>
          <DialogDescription>
            Fill in all required fields to create a new resident record.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* First Name */}
            <form.Field
              name="firstName"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'First name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      First Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Middle Name */}
            <form.Field
              name="middleName"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Middle Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            />

            {/* Last Name */}
            <form.Field
              name="lastName"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Last name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Last Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Suffix */}
            <form.Field
              name="suffix"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Suffix (Optional)</FieldLabel>
                  <select
                    id={field.name}
                    value={field.state.value || ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value
                      field.handleChange(value === '' ? '' : value)
                    }}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </Field>
              )}
            />

            {/* Birthdate */}
            <form.Field
              name="birthdate"
              validators={{
                onChange: ({ value }) => {
                  if (!value) {
                    return { message: 'Birthdate is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Birthdate <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      aria-invalid={isInvalid}
                    />
                    {field.state.value && (
                      <FieldDescription>
                        Age: {calculateAge(new Date(field.state.value).getTime())} years old
                      </FieldDescription>
                    )}
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Sex */}
            <form.Field
              name="sex"
              validators={{
                onChange: ({ value }) => {
                  if (!value || (value !== 'male' && value !== 'female' && value !== 'other')) {
                    return { message: 'Gender is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Gender <span className="text-red-500">*</span>
                    </FieldLabel>
                    <RadioGroup
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as any)}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="sex-male" />
                        <FieldLabel htmlFor="sex-male" className="cursor-pointer">Male</FieldLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="sex-female" />
                        <FieldLabel htmlFor="sex-female" className="cursor-pointer">Female</FieldLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="sex-other" />
                        <FieldLabel htmlFor="sex-other" className="cursor-pointer">Other</FieldLabel>
                      </div>
                    </RadioGroup>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Purok */}
            <form.Field
              name="purok"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Purok is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Purok <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Status */}
            <form.Field
              name="status"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as any)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                      <SelectItem value="moved">Moved</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* Senior or PWD */}
            <form.Field
              name="seniorOrPwd"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Senior or PWD</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as any)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="pwd">PWD</SelectItem>
                      <SelectItem value="both">Both (Senior & PWD)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Resident
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


// Edit Resident Dialog Component

function EditResidentDialog({
  open,
  onOpenChange,
  resident,
  onUpdate,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resident: Doc<'residents'>
  onUpdate: (args: any) => Promise<any>
  onClose: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm({
    defaultValues: {
      firstName: resident.firstName,
      middleName: resident.middleName,
      lastName: resident.lastName,
      suffix: (resident as any).suffix || '',
      sex: resident.sex,
      birthdate: format(new Date(resident.birthdate), 'yyyy-MM-dd'),
      purok: resident.purok,
      seniorOrPwd: (resident as any).seniorOrPwd || 'none',
      status: resident.status,
    },
    validators: {
      onSubmit: ({ value }) => {
        const errors: Record<string, string> = {}
        if (!value.firstName) errors.firstName = 'First name is required'
        if (!value.lastName) errors.lastName = 'Last name is required'
        if (!value.birthdate) errors.birthdate = 'Birthdate is required'
        if (!value.purok) errors.purok = 'Purok is required'
        return Object.keys(errors).length > 0 ? errors : undefined
      },
    },
    onSubmit: async ({ value }) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        const birthdateTimestamp = new Date(value.birthdate).getTime()
        await onUpdate({
          id: resident._id,
          firstName: value.firstName,
          middleName: value.middleName,
          lastName: value.lastName,
          suffix: value.suffix || undefined,
          sex: value.sex,
          birthdate: birthdateTimestamp,
          purok: value.purok,
          seniorOrPwd: value.seniorOrPwd,
          status: value.status,
        })
        toast.success('Resident updated successfully')
        onClose()
        // Close dialog after successful update
        setTimeout(() => {
          onOpenChange(false)
        }, 100)
      } catch (error: any) {
        toast.error(error.message || 'Failed to update resident')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing dialog during submission
        if (!isSubmitting) {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resident</DialogTitle>
          <DialogDescription>
            Update resident information. Resident ID: <strong>{resident.residentId}</strong>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Same fields as Add Resident Dialog */}
            {/* First Name */}
            <form.Field
              name="firstName"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'First name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      First Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Middle Name */}
            <form.Field
              name="middleName"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Middle Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            />

            {/* Last Name */}
            <form.Field
              name="lastName"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Last name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Last Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Suffix */}
            <form.Field
              name="suffix"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Suffix (Optional)</FieldLabel>
                  <select
                    id={field.name}
                    value={field.state.value || ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value
                      field.handleChange(value === '' ? '' : value)
                    }}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </Field>
              )}
            />

            {/* Birthdate */}
            <form.Field
              name="birthdate"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Birthdate <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      aria-invalid={isInvalid}
                    />
                    {field.state.value && (
                      <FieldDescription>
                        Age: {calculateAge(new Date(field.state.value).getTime())} years old
                      </FieldDescription>
                    )}
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Sex */}
            <form.Field
              name="sex"
              validators={{
                onChange: ({ value }) => {
                  if (!value || (value !== 'male' && value !== 'female' && value !== 'other')) {
                    return { message: 'Gender is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Gender <span className="text-red-500">*</span>
                    </FieldLabel>
                    <RadioGroup
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as any)}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="edit-sex-male" />
                        <FieldLabel htmlFor="edit-sex-male" className="cursor-pointer">Male</FieldLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="edit-sex-female" />
                        <FieldLabel htmlFor="edit-sex-female" className="cursor-pointer">Female</FieldLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="edit-sex-other" />
                        <FieldLabel htmlFor="edit-sex-other" className="cursor-pointer">Other</FieldLabel>
                      </div>
                    </RadioGroup>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Purok */}
            <form.Field
              name="purok"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Purok is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Purok <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Status */}
            <form.Field
              name="status"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as any)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                      <SelectItem value="moved">Moved</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* Senior or PWD */}
            <form.Field
              name="seniorOrPwd"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Senior or PWD</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as any)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="pwd">PWD</SelectItem>
                      <SelectItem value="both">Both (Senior & PWD)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Resident
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
