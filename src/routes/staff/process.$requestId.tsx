import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RouteGuard } from '@/lib/route-guards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export const Route = createFileRoute('/staff/process/$requestId')({
  component: StaffProcessPage,
})

function StaffProcessPage() {
  return (
    <RouteGuard allowedRoles={['staff']}>
      <StaffProcessContent />
    </RouteGuard>
  )
}

function StaffProcessContent() {
  const { requestId } = Route.useParams()
  const navigate = useNavigate()

  // Get request data with all related info
  const requestData = useQuery(api.documentRequests.getForProcessing, {
    id: requestId as any,
  })

  // Mutations
  const updateResident = useMutation(api.residents.update)
  const updatePurpose = useMutation(api.documentRequestItems.updatePurpose)
  const markPrinted = useMutation(api.documentRequestItems.markPrinted)
  const markAsClaim = useMutation(api.documentRequests.markAsClaim)

  // State for editable resident info
  const [residentData, setResidentData] = useState<any>(null)
  const [selectedCertificateIndex, setSelectedCertificateIndex] = useState(0)
  const [purposeValues, setPurposeValues] = useState<Record<string, string>>({})

  // Initialize resident data and purpose values when request data loads
  useEffect(() => {
    if (requestData?.resident) {
      setResidentData({ ...requestData.resident })
    }
    if (requestData?.items) {
      const purposes: Record<string, string> = {}
      requestData.items.forEach((item: any) => {
        purposes[item._id] = item.purpose || ''
      })
      setPurposeValues(purposes)
    }
    // Auto-select first pending certificate
    if (requestData?.items) {
      const firstPending = requestData.items.findIndex(
        (item: any) => item.status === 'pending'
      )
      if (firstPending !== -1) {
        setSelectedCertificateIndex(firstPending)
      }
    }
  }, [requestData])

  // Loading state
  if (requestData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    )
  }

  if (!requestData || !requestData.request || !requestData.resident) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Request not found</p>
          <Button
            onClick={() => navigate({ to: '/staff/queue' })}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queue
          </Button>
        </div>
      </div>
    )
  }

  const { request, resident: initialResident, items, queue } = requestData
  const selectedItem = items[selectedCertificateIndex]
  const allPrinted = items.every((item: any) => item.status === 'printed')

  // Handle resident info update
  const handleResidentUpdate = async () => {
    if (!residentData) return

    try {
      await updateResident({
        id: initialResident._id,
        ...residentData,
        updatedAt: Date.now(),
      })
      toast.success('Resident information updated')
    } catch (error) {
      console.error('Error updating resident:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update resident information'
      )
    }
  }

  // Handle purpose update
  const handlePurposeUpdate = async (itemId: string, purpose: string) => {
    try {
      await updatePurpose({ id: itemId as any, purpose })
      setPurposeValues((prev) => ({ ...prev, [itemId]: purpose }))
      toast.success('Purpose updated')
    } catch (error) {
      console.error('Error updating purpose:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update purpose'
      )
    }
  }

  // Handle print certificate
  const handlePrint = async (item: any) => {
    try {
      // TODO: Generate PDF here
      // For now, just mark as printed
      await markPrinted({ id: item._id })
      toast.success(`${item.documentType?.name || 'Certificate'} printed successfully`)

      // Auto-advance to next pending certificate
      // Note: requestData will update automatically via Convex real-time subscription
      // We'll use useEffect to handle the auto-advance when items update
    } catch (error) {
      console.error('Error printing certificate:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to print certificate'
      )
    }
  }

  // Auto-advance to next pending certificate when items update after printing
  useEffect(() => {
    if (!requestData?.items) return

    // Check if current selected item is now printed
    const currentItem = requestData.items[selectedCertificateIndex]
    if (currentItem?.status === 'printed') {
      // Find next pending certificate
      const nextPendingIndex = requestData.items.findIndex(
        (i: any, idx: number) => idx > selectedCertificateIndex && i.status === 'pending'
      )
      if (nextPendingIndex !== -1) {
        setSelectedCertificateIndex(nextPendingIndex)
      }
    }
  }, [requestData?.items, selectedCertificateIndex])

  // Handle mark all as done
  const handleMarkAsClaim = async () => {
    try {
      await markAsClaim({ id: request._id })
      toast.success('Request marked as claim. Ready for resident to collect.')
      navigate({ to: '/staff/queue' })
    } catch (error) {
      console.error('Error marking as claim:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to mark as claim'
      )
    }
  }

  const formatPrice = (cents: number) => {
    return `₱${(cents / 100).toFixed(2)}`
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return format(new Date(timestamp), 'MMM dd, yyyy h:mm a')
  }

  const calculateAge = (birthdate: number) => {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              onClick={() => navigate({ to: '/staff/queue' })}
              variant="ghost"
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Queue
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Process Request</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Editable Form (60%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Request Number:</span>
                    <p className="font-medium">{request.requestNumber}</p>
                  </div>
                  {queue && (
                    <div>
                      <span className="text-gray-500">Queue Number:</span>
                      <p className="font-medium">{queue.queueNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Total Price:</span>
                    <p className="font-medium">{formatPrice(request.totalPrice)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Requested:</span>
                    <p className="font-medium">{formatDate(request.requestedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resident Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Resident Information</CardTitle>
                <p className="text-sm text-gray-500">
                  Auto-filled from database. Edit if corrections are needed.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {residentData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={residentData.firstName || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={residentData.middleName || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, middleName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={residentData.lastName || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, lastName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="residentId">Resident ID</Label>
                        <Input
                          id="residentId"
                          value={residentData.residentId || ''}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zone">Zone</Label>
                        <Input
                          id="zone"
                          value={residentData.zone || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, zone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="purok">Purok</Label>
                        <Input
                          id="purok"
                          value={residentData.purok || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, purok: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={residentData.address || ''}
                          onChange={(e) =>
                            setResidentData({ ...residentData, address: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="birthdate">Birthdate</Label>
                        <Input
                          id="birthdate"
                          type="date"
                          value={
                            residentData.birthdate
                              ? format(new Date(residentData.birthdate), 'yyyy-MM-dd')
                              : ''
                          }
                          onChange={(e) => {
                            const timestamp = new Date(e.target.value).getTime()
                            setResidentData({ ...residentData, birthdate: timestamp })
                          }}
                        />
                        {residentData.birthdate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Age: {calculateAge(residentData.birthdate)} years old
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleResidentUpdate} size="sm">
                      Save Resident Changes
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Certificates List */}
            <Card>
              <CardHeader>
                <CardTitle>Certificates</CardTitle>
                <p className="text-sm text-gray-500">
                  Process certificates one at a time. Select a certificate to edit purpose and print.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item: any, index: number) => {
                  const isSelected = index === selectedCertificateIndex
                  const isPrinted = item.status === 'printed'

                  return (
                    <div
                      key={item._id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${isPrinted ? 'opacity-75' : ''}`}
                      onClick={() => !isPrinted && setSelectedCertificateIndex(index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">
                              {item.documentType?.name || 'Unknown Certificate'}
                            </h3>
                            <Badge
                              variant={isPrinted ? 'default' : 'secondary'}
                              className={
                                isPrinted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {isPrinted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Printed
                                </>
                              ) : (
                                'Pending'
                              )}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatPrice(item.documentType?.price || 0)}
                            </span>
                          </div>

                          {isSelected && !isPrinted && (
                            <div className="mt-3 space-y-2">
                              <Label htmlFor={`purpose-${item._id}`}>
                                Purpose {item.documentType?.requiresPurpose && '*'}
                              </Label>
                              <Textarea
                                id={`purpose-${item._id}`}
                                value={purposeValues[item._id] || ''}
                                onChange={(e) => {
                                  setPurposeValues({
                                    ...purposeValues,
                                    [item._id]: e.target.value,
                                  })
                                }}
                                onBlur={() =>
                                  handlePurposeUpdate(item._id, purposeValues[item._id] || '')
                                }
                                placeholder="Enter purpose for this certificate"
                                rows={2}
                              />
                              <Button
                                onClick={() => handlePrint(item)}
                                className="w-full"
                                size="sm"
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print {item.documentType?.name || 'Certificate'}
                              </Button>
                            </div>
                          )}

                          {isSelected && isPrinted && (
                            <p className="text-sm text-gray-500 mt-2">
                              This certificate has been printed.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Mark All as Done Button */}
            {allPrinted && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleMarkAsClaim}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Mark All as Done (Ready for Claim)
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Live Preview (40%) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Certificate Preview</CardTitle>
                <p className="text-sm text-gray-500">
                  {selectedItem?.documentType?.name || 'Select a certificate'}
                </p>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-white min-h-[400px]">
                      <div className="text-center text-gray-500">
                        <p className="text-lg font-medium mb-2">
                          {selectedItem.documentType?.name || 'Certificate'}
                        </p>
                        <p className="text-sm">
                          Live preview will appear here
                        </p>
                        <p className="text-xs mt-4 text-gray-400">
                          TODO: Implement certificate template rendering
                        </p>
                      </div>
                      {/* TODO: Render actual certificate template here */}
                      {residentData && (
                        <div className="mt-4 text-left text-sm space-y-1">
                          <p>
                            <strong>Name:</strong>{' '}
                            {`${residentData.firstName || ''} ${residentData.middleName || ''} ${residentData.lastName || ''}`.trim()}
                          </p>
                          <p>
                            <strong>Address:</strong> {residentData.address || 'N/A'}
                          </p>
                          <p>
                            <strong>Zone:</strong> {residentData.zone || 'N/A'}
                          </p>
                          <p>
                            <strong>Purpose:</strong> {purposeValues[selectedItem._id] || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No certificate selected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
