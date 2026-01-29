import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { RouteGuard } from '@/lib/route-guards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import {
  CalendarIcon,
  FileText,
  Loader2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuperadminSidebarLayout } from '@/components/SuperadminSidebar'
import { SuperadminHeader } from '@/components/SuperadminHeader'

export const Route = createFileRoute('/superadmin/transactions')({
  component: SuperadminTransactionsPage,
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

function SuperadminTransactionsPage() {
  return (
    <RouteGuard allowedRoles={['superadmin']}>
      <SuperadminSidebarLayout>
        <SuperadminHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <SuperadminTransactionsContent />
            </div>
          </div>
        </div>
      </SuperadminSidebarLayout>
    </RouteGuard>
  )
}

function SuperadminTransactionsContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [residentSearch, setResidentSearch] = useState<string>('')
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  // Only skip query if user is not signed in (not if auth is still loading)
  // This prevents unnecessary refetches during navigation
  const shouldSkipQuery = authLoaded && !isSignedIn

  // Get document types for filter
  const documentTypes = useQuery(
    api.documentTypes.list,
    shouldSkipQuery ? 'skip' : { includeInactive: false }
  )

  // Get transactions with filters
  const transactions = useQuery(
    api.documentRequests.listEnriched,
    shouldSkipQuery
      ? 'skip'
      : {
          status:
            selectedStatus === ''
              ? undefined
              : (selectedStatus as
                  | 'pending'
                  | 'queued'
                  | 'serving'
                  | 'completed'
                  | 'cancelled'),
          startDate: startDate ? startDate.getTime() : undefined,
          endDate: endDate ? endDate.getTime() : undefined,
          documentTypeId: selectedDocumentType ? (selectedDocumentType as Id<'documentTypes'>) : undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        }
  )

  // Filter by resident search (client-side)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    if (!residentSearch.trim()) return transactions

    const searchLower = residentSearch.toLowerCase()
    return transactions.filter((tx) => {
      const resident = tx.resident
      if (!resident) return false
      const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName}`.toLowerCase()
      const residentId = resident.residentId?.toLowerCase() || ''
      return fullName.includes(searchLower) || residentId.includes(searchLower)
    })
  }, [transactions, residentSearch])

  // Only show loading spinner on initial load (when auth is not loaded AND no cached data)
  // This prevents showing loading spinner on every navigation
  const isInitialLoad = !authLoaded && transactions === undefined && documentTypes === undefined
  
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    )
  }

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request)
    setDetailDialogOpen(true)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'serving':
        return 'secondary'
      case 'queued':
        return 'outline'
      case 'pending':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-1">All document request transactions</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter transactions by status, date range, resident, or document type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Document Type Filter */}
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedDocumentType || "all"} onValueChange={(value) => setSelectedDocumentType(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes?.map((docType) => (
                    <SelectItem key={docType._id} value={docType._id}>
                      {docType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resident Search */}
            <div className="space-y-2">
              <Label>Search Resident</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or ID..."
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedStatus || startDate || endDate || selectedDocumentType || residentSearch) && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStatus('')
                  setStartDate(undefined)
                  setEndDate(undefined)
                  setSelectedDocumentType('')
                  setResidentSearch('')
                  setCurrentPage(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Requests</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">No transactions found</p>
              <p className="text-sm text-gray-500">
                {selectedStatus || startDate || endDate || selectedDocumentType || residentSearch
                  ? 'Try adjusting your filters'
                  : 'No document requests have been made yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Resident</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Queue #</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="font-mono text-sm">
                          {tx.requestNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tx.requestedAt), 'MMM dd, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {tx.resident ? (
                            <div>
                              <div className="font-medium">
                                {tx.resident.firstName} {tx.resident.middleName} {tx.resident.lastName}
                                {tx.resident.suffix && ` ${tx.resident.suffix}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tx.resident.residentId}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tx.items.slice(0, 2).map((item: any) => (
                              <Badge key={item._id} variant="outline" className="text-xs">
                                {item.documentType?.name || 'Unknown'}
                              </Badge>
                            ))}
                            {tx.items.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{tx.items.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(tx.status)}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.queue?.queueNumber ? (
                            <span className="font-mono">{tx.queue.queueNumber}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          ₱{(tx.totalPrice / 100).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(tx)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} • Showing {filteredTransactions.length} of{' '}
                  {filteredTransactions.length} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={filteredTransactions.length < pageSize}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Request #{selectedRequest?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <div>
                <h3 className="font-semibold mb-2">Request Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Request Number:</span>
                    <p className="font-mono font-medium">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>
                      <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>
                        {selectedRequest.status.charAt(0).toUpperCase() +
                          selectedRequest.status.slice(1)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested At:</span>
                    <p>{format(new Date(selectedRequest.requestedAt), 'PPP p')}</p>
                  </div>
                  {selectedRequest.completedAt && (
                    <div>
                      <span className="text-muted-foreground">Completed At:</span>
                      <p>{format(new Date(selectedRequest.completedAt), 'PPP p')}</p>
                    </div>
                  )}
                  {selectedRequest.queue && (
                    <div>
                      <span className="text-muted-foreground">Queue Number:</span>
                      <p className="font-mono">{selectedRequest.queue.queueNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Total Price:</span>
                    <p className="font-semibold">
                      ₱{(selectedRequest.totalPrice / 100).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resident Info */}
              {selectedRequest.resident && (
                <div>
                  <h3 className="font-semibold mb-2">Resident Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">
                        {selectedRequest.resident.firstName}{' '}
                        {selectedRequest.resident.middleName}{' '}
                        {selectedRequest.resident.lastName}
                        {selectedRequest.resident.suffix &&
                          ` ${selectedRequest.resident.suffix}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Resident ID:</span>
                      <p className="font-mono">{selectedRequest.resident.residentId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Purok:</span>
                      <p>{selectedRequest.resident.purok}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>
                      <p className="capitalize">{selectedRequest.resident.sex}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Services/Items */}
              <div>
                <h3 className="font-semibold mb-2">Services Requested</h3>
                <div className="space-y-2">
                  {selectedRequest.items.map((item: any) => (
                    <Card key={item._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.documentType?.name || 'Unknown Service'}
                            </p>
                            {item.purpose && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Purpose: {item.purpose}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                Status:{' '}
                                <Badge
                                  variant={
                                    item.status === 'printed' ? 'default' : 'outline'
                                  }
                                  className="ml-1"
                                >
                                  {item.status.charAt(0).toUpperCase() +
                                    item.status.slice(1)}
                                </Badge>
                              </span>
                              {item.printedAt && (
                                <span>
                                  Printed:{' '}
                                  {format(new Date(item.printedAt), 'MMM dd, yyyy h:mm a')}
                                </span>
                              )}
                              <span>
                                Price:{' '}
                                ₱{((item.documentType?.price || 0) / 100).toLocaleString(
                                  'en-US',
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
