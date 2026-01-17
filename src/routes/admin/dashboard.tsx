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
import { Users, BarChart3, Clock, Search, Plus, MoreVertical, Edit, Trash2, Eye, Upload, ChevronLeft, ChevronRight, Save } from 'lucide-react'
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
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [residentToDelete, setResidentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [residentToEdit, setResidentToEdit] = useState<Doc<'residents'> | null>(null)

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
  }, [statusFilter, genderFilter])

  const shouldSkipQuery = !authLoaded || !isSignedIn
  const offset = (currentPage - 1) * PAGE_SIZE

  // ✅ OPTIMIZED: Query residents with all filters (server-side: status, gender)
  const residents = useQuery(
    api.residents.list,
    shouldSkipQuery
      ? 'skip'
      : {
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
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
  const createResident = useMutation(api.residents.create)
  const updateResident = useMutation(api.residents.update)

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
      return filtered
    }
    // For list queries, server-side filtering is already applied
    return displayResidents
  }, [displayResidents, statusFilter, debouncedSearchTerm])

  // Calculate pagination info
  const hasMore = filteredResidents.length === PAGE_SIZE

  const handleDelete = async () => {
    if (!residentToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteResident({ id: residentToDelete as any })
      toast.success('Resident deleted successfully')
      setDeleteDialogOpen(false)
      setResidentToDelete(null)
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
                    <TableRow key={resident._id}>
                      <TableCell className="font-mono text-sm">
                        {resident.residentId}
                      </TableCell>
                      <TableCell>
                        {resident.firstName} {resident.middleName} {resident.lastName}
                        {(resident as any).suffix && ` ${(resident as any).suffix}`}
                      </TableCell>
                      <TableCell>{resident.purok}</TableCell>
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

        {/* Add Resident Dialog */}
        <AddResidentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onCreate={createResident}
        />

        {/* Edit Resident Dialog */}
        {residentToEdit && (
          <EditResidentDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            resident={residentToEdit}
            onUpdate={updateResident}
            onClose={() => setResidentToEdit(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(newOpen) => {
            // Prevent closing dialog during deletion
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
