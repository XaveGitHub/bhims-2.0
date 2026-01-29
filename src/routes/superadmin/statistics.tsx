import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import { RouteGuard } from '@/lib/route-guards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, BarChart3, Users, FileText, DollarSign, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuperadminSidebarLayout } from '@/components/SuperadminSidebar'
import { SuperadminHeader } from '@/components/SuperadminHeader'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export const Route = createFileRoute('/superadmin/statistics')({
  component: SuperadminStatisticsPage,
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

function SuperadminStatisticsPage() {
  return (
    <RouteGuard allowedRoles={['superadmin']}>
      <SuperadminSidebarLayout>
        <SuperadminHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <SuperadminStatisticsContent />
            </div>
          </div>
        </div>
      </SuperadminSidebarLayout>
    </RouteGuard>
  )
}

function SuperadminStatisticsContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [selectedPurok, setSelectedPurok] = useState<string>('')
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Only skip query if user is not signed in (not if auth is still loading)
  // This prevents unnecessary refetches during navigation
  const shouldSkipQuery = authLoaded && !isSignedIn

  // Get unique puroks for dropdown
  const puroks = useQuery(
    api.residents.getUniquePuroks,
    shouldSkipQuery ? 'skip' : {}
  )

  // Get detailed statistics with filters
  const stats = useQuery(
    api.statistics.getDetailedStats,
    shouldSkipQuery
      ? 'skip'
      : {
          purok: selectedPurok || undefined,
          gender: selectedGender || undefined,
          startDate: startDate ? startDate.getTime() : undefined,
          endDate: endDate ? endDate.getTime() : undefined,
        }
  )

  // Only show loading spinner on initial load (when auth is not loaded AND no cached data)
  // This prevents showing loading spinner on every navigation
  const isInitialLoad = !authLoaded && stats === undefined && puroks === undefined
  
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

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

  // Prepare chart data
  const genderChartData = [
    { name: 'Male', value: stats.residents.male, color: '#3b82f6' },
    { name: 'Female', value: stats.residents.female, color: '#ec4899' },
    { name: 'Other', value: stats.residents.other, color: '#8b5cf6' },
  ].filter(item => item.value > 0)

  const documentsByMonthData = stats.documents.byMonth.map((item) => ({
    month: format(new Date(`${item.month}-01`), 'MMM yyyy'),
    count: item.count,
  }))

  const documentsByTypeData = stats.documents.byType.slice(0, 10).map((item) => ({
    name: item.documentTypeName,
    count: item.count,
  }))

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Statistics & Reports</h1>
        <p className="text-muted-foreground mt-1">Detailed analytics and insights</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter statistics by purok, gender, and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Purok Filter */}
            <div className="space-y-2">
              <Label>Purok</Label>
              <Select value={selectedPurok || "all"} onValueChange={(value) => setSelectedPurok(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Puroks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Puroks</SelectItem>
                  {puroks?.map((purok) => (
                    <SelectItem key={purok} value={purok}>
                      {purok}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup value={selectedGender} onValueChange={(value) => setSelectedGender(value as any)}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="" id="gender-all" />
                    <Label htmlFor="gender-all" className="cursor-pointer">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male" className="cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female" className="cursor-pointer">Female</Label>
                  </div>
                </div>
              </RadioGroup>
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
          </div>

          {/* Clear Filters Button */}
          {(selectedPurok || selectedGender || startDate || endDate) && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPurok('')
                  setSelectedGender('')
                  setStartDate(undefined)
                  setEndDate(undefined)
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Residents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.residents.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.purok ? `In ${stats.purok}` : 'All puroks'}
            </p>
          </CardContent>
        </Card>

        {/* Documents Issued */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Issued</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {startDate || endDate ? 'In date range' : 'All time'}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue (Superadmin only) */}
        {'sales' in stats && stats.sales && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₱{(stats.sales.totalRevenue / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {startDate || endDate ? 'In date range' : 'All time'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Revenue This Month (Superadmin only) */}
        {'sales' in stats && stats.sales && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₱{(stats.sales.revenueThisMonth / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 1: Population & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gender Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Population by Gender</CardTitle>
            <CardDescription>Gender distribution of residents</CardDescription>
          </CardHeader>
          <CardContent>
            {genderChartData.length > 0 ? (
              <ChartContainer
                config={{
                  male: { color: '#3b82f6' },
                  female: { color: '#ec4899' },
                  other: { color: '#8b5cf6' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Issued by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Documents Issued by Month</CardTitle>
            <CardDescription>Monthly trend of documents issued</CardDescription>
          </CardHeader>
          <CardContent>
            {documentsByMonthData.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: 'Documents', color: '#3b82f6' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={documentsByMonthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Documents by Type & Revenue (if superadmin) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Documents by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Documents Issued by Type</CardTitle>
            <CardDescription>Top document types requested</CardDescription>
          </CardHeader>
          <CardContent>
            {documentsByTypeData.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: 'Documents', color: '#10b981' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={documentsByTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Month (Superadmin only) */}
        {'sales' in stats && stats.sales && stats.sales.revenueByMonth.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
              <CardDescription>Monthly revenue trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: 'Revenue (₱)', color: '#f59e0b' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.sales.revenueByMonth.map((item: { month: string; revenue: number }) => ({
                      month: format(new Date(`${item.month}-01`), 'MMM yyyy'),
                      revenue: item.revenue / 100, // Convert cents to pesos
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Bar dataKey="revenue" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Type Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents by Type</CardTitle>
            <CardDescription>Breakdown of documents issued by type</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.documents.byType.length > 0 ? (
              <div className="space-y-2">
                {stats.documents.byType.map((item) => (
                  <div key={item.documentTypeId} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{item.documentTypeName}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents issued yet</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Type Table (Superadmin only) */}
        {'sales' in stats && stats.sales && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Document Type</CardTitle>
              <CardDescription>Revenue breakdown by document type</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.sales.revenueByType.length > 0 ? (
                <div className="space-y-2">
                  {stats.sales.revenueByType.map((item: { documentTypeId: string; documentTypeName: string; revenue: number }) => (
                    <div key={item.documentTypeId} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{item.documentTypeName}</span>
                      <Badge variant="secondary">
                        ₱{(item.revenue / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No revenue data available</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
