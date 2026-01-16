import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RouteGuard } from '@/lib/route-guards'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  PlayCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export const Route = createFileRoute('/staff/queue')({
  component: StaffQueuePage,
})

function StaffQueuePage() {
  return (
    <RouteGuard allowedRoles={['staff']}>
      <StaffQueueContent />
    </RouteGuard>
  )
}

function StaffQueueContent() {
  const navigate = useNavigate()

  // Get document requests for staff dashboard
  const requestsData = useQuery(api.documentRequests.getStaffRequests, {})

  // Mutations
  const processNext = useMutation(api.queue.processNext)

  // Loading state
  if (requestsData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    )
  }

  const handleProcessNext = async () => {
    try {
      const result = await processNext({})
      toast.success('Request processed successfully')
      
      // Navigate to process page
      if (result?.documentRequestId) {
        navigate({
          to: '/staff/process/$requestId',
          params: { requestId: result.documentRequestId },
        })
      }
    } catch (error) {
      console.error('Error processing next:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to process next request'
      )
    }
  }

  const handleItemClick = (requestId: string) => {
    navigate({
      to: '/staff/process/$requestId',
      params: { requestId },
    })
  }

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return format(new Date(timestamp), 'h:mm a')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Document Requests</h1>
              <p className="text-sm text-gray-600 mt-1">
                {requestsData.counts.queued > 0
                  ? `${requestsData.counts.queued} request${requestsData.counts.queued === 1 ? '' : 's'} waiting to be processed`
                  : 'No requests waiting'}
              </p>
            </div>
            <Button
              onClick={handleProcessNext}
              disabled={requestsData.counts.queued === 0}
              size="lg"
              className="gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Process Next
            </Button>
          </div>
        </div>

        {/* Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Currently Processing (Narrow) */}
          {requestsData.serving.length > 0 ? (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Currently Processing
                </h2>
                <div className="space-y-3">
                  {requestsData.serving.map((request) => (
                    <Card
                      key={request._id}
                      className="cursor-pointer hover:shadow-md transition-all border-2 border-yellow-400 bg-yellow-50/50"
                      onClick={() => handleItemClick(request._id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-bold text-yellow-800">
                              {request.requestNumber}
                            </p>
                            <Badge className="bg-yellow-600 text-white text-xs border-0">
                              Active
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {request.resident
                              ? `${request.resident.firstName} ${request.resident.lastName}`
                              : 'Guest'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {request.items?.length || 0} {request.items?.length === 1 ? 'certificate' : 'certificates'} • ₱{((request.totalPrice || 0) / 100).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleItemClick(request._id)
                            }}
                          >
                            Continue →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Right Column: Waiting Requests (Main Focus) */}
          <div className={requestsData.serving.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {requestsData.queued.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Waiting to Process</h2>
                <div className="space-y-3">
                  {requestsData.queued.map((request) => (
                    <Card
                      key={request._id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-blue-400 border-2 border-blue-200 bg-white"
                      onClick={() => handleItemClick(request._id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-mono text-lg font-bold text-blue-700">
                                {request.requestNumber}
                              </p>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                Waiting
                              </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <span className="font-medium text-gray-900">
                                {request.resident
                                  ? `${request.resident.firstName} ${request.resident.lastName}`
                                  : 'Guest'}
                              </span>
                              <span>
                                {request.items?.length || 0} {request.items?.length === 1 ? 'certificate' : 'certificates'}
                              </span>
                              <span>₱{((request.totalPrice || 0) / 100).toFixed(2)}</span>
                              <span className="text-gray-500">{formatTime(request.requestedAt)}</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline"
                            size="sm" 
                            className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleItemClick(request._id)
                            }}
                          >
                            Process →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : requestsData.serving.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-xl text-gray-600 font-medium mb-2">No requests waiting</p>
                  <p className="text-sm text-gray-500">All requests have been processed</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 font-medium mb-2">No new requests waiting</p>
                  <p className="text-sm text-gray-500">Continue with your current processing on the left</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
