import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { RouteGuard } from '@/lib/route-guards'
import { AdminSidebarLayout } from '@/components/AdminSidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, BarChart3, Clock, Plus, Eye, Upload, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, CartesianGrid, LabelList } from 'recharts'

// Simple in-memory cache for admin dashboard stats
let cachedDashboardStats: any | null = null
let cachedDashboardStatsFetchedAt: number | null = null
const DASHBOARD_STATS_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <AdminSidebarLayout>
        <AdminDashboardContent />
      </AdminSidebarLayout>
    </RouteGuard>
  )
}

export function AdminDashboardContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  
  // ✅ SAFETY: Only query when auth is loaded and user is signed in
  // This prevents queries from running before auth token is ready (prevents ctx.auth errors)
  const shouldSkipQuery = !authLoaded || !isSignedIn

  // Local state backed by a module-level cache so we can reuse stats
  const [localStats, setLocalStats] = useState<any | null>(() => cachedDashboardStats)

  const hasFreshCache =
    !!cachedDashboardStatsFetchedAt &&
    Date.now() - cachedDashboardStatsFetchedAt < DASHBOARD_STATS_TTL_MS

  const stats = useQuery(
    api.statistics.getDashboardStats,
    shouldSkipQuery || hasFreshCache ? 'skip' : {}
  )

  // When fresh stats arrive, update the shared cache and local state
  useEffect(() => {
    if (stats) {
      cachedDashboardStats = stats
      cachedDashboardStatsFetchedAt = Date.now()
      setLocalStats(stats)
    }
  }, [stats])

  // Get pending residents for summary
  const pendingResidents = useQuery(
    api.residents.listByStatus,
    shouldSkipQuery ? 'skip' : { status: 'pending', limit: 10 }
  )

  // Loading state - wait for auth to load first
  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  // Error state - query returned null (auth error or unauthorized) AND no cached stats
  if (stats === null && !localStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Failed to load statistics</p>
          <p className="text-sm text-gray-500">
            Please refresh the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    )
  }

  const effectiveStats = localStats

  const totalResidents = effectiveStats?.residents?.total
  const maleResidents = effectiveStats?.residents?.male
  const femaleResidents = effectiveStats?.residents?.female
  const otherResidents = effectiveStats?.residents?.other
  const queueToday = effectiveStats?.queue?.today
  const ageGroups = effectiveStats?.residents?.ageGroups

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
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
              <div className="text-2xl font-bold">
                {totalResidents != null ? totalResidents.toLocaleString() : '—'}
              </div>
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
                  <span className="text-lg font-semibold">
                    {maleResidents != null ? maleResidents.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Female</span>
                  <span className="text-lg font-semibold">
                    {femaleResidents != null ? femaleResidents.toLocaleString() : '—'}
                  </span>
                </div>
                {otherResidents != null && otherResidents > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Other</span>
                    <span className="text-lg font-semibold">
                      {otherResidents != null ? otherResidents.toLocaleString() : '—'}
                    </span>
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
              <div className="text-2xl font-bold">
                {queueToday != null ? queueToday : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Requests processed today</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Statistics (Superadmin only) */}
        {stats && 'sales' in stats && stats.sales && (
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

        {/* Chart and Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Age Group Distribution Chart - Left Side (2/3 width) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Age Group Distribution</CardTitle>
                <CardDescription>Population breakdown by age groups</CardDescription>
              </CardHeader>
              <CardContent>
                {ageGroups ? (
                  <ChartContainer
                    config={{
                      total: {
                        label: "Total",
                        color: "hsl(var(--chart-1))",
                      },
                    } satisfies ChartConfig}
                    className="h-[300px]"
                  >
                    <BarChart
                      accessibilityLayer
                      data={[
                          { ageGroup: '0-5', total: ageGroups.age0to5.total },
                          { ageGroup: '6-12', total: ageGroups.age6to12.total },
                          { ageGroup: '13-17', total: ageGroups.age13to17.total },
                          { ageGroup: '18-35', total: ageGroups.age18to35.total },
                          { ageGroup: '36-50', total: ageGroups.age36to50.total },
                          { ageGroup: '51-65', total: ageGroups.age51to65.total },
                          { ageGroup: '65+', total: ageGroups.age65plus.total },
                      ]}
                      margin={{
                        top: 20,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="ageGroup"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="total" fill="var(--color-total)" radius={8}>
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading chart data...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Right Side (1/3 width) */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  onClick={() => navigate({ to: '/admin/residents' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resident
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate({ to: '/admin/residents' })}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate({ to: '/admin/residents' })}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Residents
                </Button>
              </CardContent>
            </Card>

            {/* Pending Residents Summary */}
            {pendingResidents && pendingResidents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Pending Residents</CardTitle>
                  <CardDescription>{pendingResidents.length} awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingResidents.slice(0, 5).map((resident) => (
                      <div
                        key={resident._id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate({ to: `/admin/residents/${resident._id}` })}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {resident.firstName} {resident.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{resident.purok}</p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    ))}
                    {pendingResidents.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => navigate({ to: '/admin/residents', search: { status: 'pending' } })}
                      >
                        View All {pendingResidents.length} Pending →
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

            {/* Pending Resident Confirmations Section (Full Width) */}
            <PendingResidentConfirmationsSection />
          </div>
        </div>
      </div>
  )
}

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
  const shouldSkipQuery = !authLoaded || !isSignedIn

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

  // Convex queries auto-refresh, so no manual refresh needed

  const handleApprove = async () => {
    if (!residentToApprove || isApproving) return
    setIsApproving(true)
    try {
      await approvePending({ id: residentToApprove._id })
      toast.success('Resident approved successfully')
      setApproveDialogOpen(false)
      setResidentToApprove(null)
      // Convex queries auto-refresh after mutations
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
      // Convex queries auto-refresh after mutations
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
    <Card id="pending-section" className="mb-8">
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
